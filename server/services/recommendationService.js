import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import Route from '../models/Route.js';
import { crowdEstimate, crowdPenalty } from './crowdService.js';
import { estimateEta } from './etaService.js';
import { predictEtaMl } from './etaMlService.js';

export async function recommendations(routeId, destinationStopId) {
  const buses = await Bus.find({
    routeId,
    status: 'ACTIVE',
    tripStatus: 'IN_PROGRESS',
  }).populate('currentStop');

  const route = await Route.findById(routeId).populate('stops');

  const choices = await Promise.all(
    buses.map(async bus => {
      const activeTrip = await Trip.findOne({
        busId: bus._id,
        status: 'ACTIVE',
      });

      const crowd = await crowdEstimate(bus._id, routeId);
      const delayMinutes = activeTrip?.delayMinutes || 0;

      const mlEta = activeTrip
        ? await predictEtaMl({ route, currentStopId: bus.currentStop?._id, destinationStopId, delayMinutes, trip: activeTrip })
        : null;

      let etaMinutes;
      let etaSource;
      let etaReason;

      if (mlEta && mlEta.eta) {
        etaMinutes = mlEta.eta;
        etaSource = mlEta.source;
        etaReason = mlEta.reason;
      } else {
        etaMinutes = await estimateEta(route, bus.currentStop?._id, destinationStopId, delayMinutes);
        etaSource = 'deterministic_baseline';
        etaReason = mlEta?.reason || 'Deterministic baseline (4 min per segment + delay)';
      }

      const score =
        etaMinutes * 4 +
        crowdPenalty(crowd.crowdLevel) +
        delayMinutes * 2 -
        (crowd.availableSeats || 0) * 0.15;

      return {
        bus,
        etaMinutes,
        etaSource,
        etaReason,
        crowd,
        score: Math.round(score),
        delayMinutes,
      };
    })
  );

  choices.sort((a, b) => a.score - b.score);

  const best = choices[0];
  const alternative = choices[1];

  let reason = best?.etaReason || 'Recommended because it offers the best ETA and capacity balance.';

  if (best && alternative) {
    const bestCrowdIsGood = ['LOW', 'MEDIUM'].includes(best.crowd.crowdLevel);
    const etaDiff = best.etaMinutes - alternative.etaMinutes;

    if (bestCrowdIsGood && etaDiff > 0) {
      reason = `Recommended because it has lower predicted crowd despite a ${etaDiff}-minute longer ETA.`;
    } else if (bestCrowdIsGood && etaDiff <= 0) {
      reason = 'Recommended because it offers a better ETA and significantly lower crowd.';
    } else if (!bestCrowdIsGood && alternative && ['LOW', 'MEDIUM'].includes(alternative.crowd.crowdLevel)) {
      reason = `Alternative bus has lower crowd. Current recommendation balances ETA and capacity.`;
    }
  } else if (best && ['LOW', 'MEDIUM'].includes(best.crowd.crowdLevel)) {
    reason = 'Recommended because it offers a better ETA and significantly lower crowd.';
  }

  return {
    recommendation: best ? { ...best, reason } : null,
    buses: choices,
  };
}

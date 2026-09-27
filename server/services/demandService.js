import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Trip from '../models/Trip.js';
import TicketTransaction from '../models/TicketTransaction.js';
import { getEtaModel } from './etaMlService.js';

export async function predictDemand({ routeId, currentStopId, capacity }) {
  const route = await Route.findById(routeId).populate('stops');
  if (!route || !route.stops.length) return [];

  const currentIndex = route.stops.findIndex(s => String(s._id) === String(currentStopId));
  if (currentIndex === -1) return [];

  const activeTrip = await Trip.findOne({ routeId, status: 'ACTIVE' });
  const tripId = activeTrip?._id;
  const tickets = tripId ? await TicketTransaction.find({ tripId }).lean() : [];

  const currentOccupancy = tickets.reduce((total, t) => {
    const sourceIdx = route.stops.findIndex(s => String(s._id) === String(t.sourceStopId));
    const destIdx = route.stops.findIndex(s => String(s._id) === String(t.destinationStopId));
    return sourceIdx <= currentIndex && destIdx > currentIndex ? total + t.passengerCount : total;
  }, 0);

  const predictions = [];
  const hour = new Date().getHours();
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);

  for (let i = currentIndex + 1; i < route.stops.length; i++) {
    const stop = route.stops[i];
    const segmentsFromCurrent = i - currentIndex;
    const baseMinutes = segmentsFromCurrent * 4;

    const historicalAlightings = tickets.filter(t => String(t.destinationStopId) === String(stop._id))
      .reduce((s, t) => s + t.passengerCount, 0);
    const historicalBoardings = tickets.filter(t => String(t.sourceStopId) === String(stop._id))
      .reduce((s, t) => s + t.passengerCount, 0);

    let predictedAlighting = Math.max(1, Math.round(historicalAlightings * 0.6 + (isPeak ? 2 : 0)));
    let predictedBoardings = Math.max(1, Math.round(historicalBoardings * 0.7 + (isPeak ? 3 : 1)));

    if (i === route.stops.length - 1) predictedAlighting = Math.max(predictedAlighting, Math.round(capacity * 0.4));

    let onboard = currentOccupancy;
    for (let j = currentIndex + 1; j <= i; j++) {
      onboard = onboard - (j === i ? predictedAlighting : 0) + (j === i ? predictedBoardings : 2);
      onboard = Math.max(0, Math.min(capacity, onboard));
    }

    predictions.push({
      stopId: stop._id,
      stopName: stop.name,
      segmentsAway: segmentsFromCurrent,
      estimatedMinutesAway: baseMinutes,
      predictedBoardings,
      predictedAlightings: predictedAlighting,
      predictedOccupancy: onboard,
      availableSeats: Math.max(0, capacity - onboard),
      crowdLevel: levelFor(onboard, capacity),
      confidence: 0.4,
      source: 'DEMAND_MODEL',
      note: 'Prototype prediction. Train on more historical trip data to improve accuracy.',
    });
  }

  return predictions;
}

function levelFor(onboard, capacity) {
  const ratio = capacity ? onboard / capacity : 0;
  if (ratio <= 0.35) return 'LOW';
  if (ratio <= 0.7) return 'MEDIUM';
  if (ratio < 0.95) return 'HIGH';
  return 'FULL';
}

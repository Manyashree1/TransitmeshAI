import TicketTransaction from '../models/TicketTransaction.js';

const levelFor = (onboard, capacity) => {
  const ratio = capacity ? onboard / capacity : 0;
  if (ratio <= 0.35) return 'LOW';
  if (ratio <= 0.7) return 'MEDIUM';
  if (ratio < 0.95) return 'HIGH';
  return 'FULL';
};

const calculateConfidence = ({ ticketCount, capacity, currentStop, totalOnboard, routeLength }) => {
  const signalWeight = Math.min(0.85, 0.35 + ticketCount * 0.12);
  const completeness = routeLength > 0 ? Math.min(0.2, 0.08 + (currentStop ? 0.08 : 0)) : 0.05;
  const fullnessWeight = capacity ? Math.min(0.2, totalOnboard / capacity * 0.2) : 0;
  return Number(Math.min(0.97, signalWeight + completeness + fullnessWeight).toFixed(2));
};

export function buildSegmentAwareOccupancy({ tickets = [], stops = [], currentStop = null, capacity = 0 }) {
  const orderedStops = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const currentIndex = orderedStops.findIndex(stop => String(stop._id) === String(currentStop));
  const indexOf = stopId => orderedStops.findIndex(stop => String(stop._id) === String(stopId));
  const segmentBreakdown = {};

  for (const ticket of tickets) {
    const sourceIndex = indexOf(ticket.sourceStopId);
    const destinationIndex = indexOf(ticket.destinationStopId);
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex <= sourceIndex) continue;

    for (let i = sourceIndex; i < destinationIndex; i++) {
      const sourceStop = orderedStops[i];
      const nextStop = orderedStops[i + 1];
      if (!sourceStop || !nextStop) continue;
      const key = `${String(sourceStop._id)}:${String(nextStop._id)}`;
      segmentBreakdown[key] = (segmentBreakdown[key] || 0) + Number(ticket.passengerCount || 0);
    }
  }

  const estimatedPassengers = tickets.reduce((total, ticket) => {
    const sourceIndex = indexOf(ticket.sourceStopId);
    const destinationIndex = indexOf(ticket.destinationStopId);
    if (sourceIndex < 0 || destinationIndex < 0) return total;
    if (currentIndex === -1) {
      return sourceIndex < destinationIndex ? total + Number(ticket.passengerCount || 0) : total;
    }

    const isOnBoardAtCurrentStop = sourceIndex <= currentIndex && destinationIndex > currentIndex;
    const isArrivingAtCurrentStop = sourceIndex === currentIndex - 1 && destinationIndex === currentIndex;

    return isOnBoardAtCurrentStop || isArrivingAtCurrentStop
      ? total + Number(ticket.passengerCount || 0)
      : total;
  }, 0);

  const estimatedOnboard = Math.min(Math.max(0, estimatedPassengers), capacity || estimatedPassengers || 0);
  const availableSeats = Math.max(0, (capacity || 0) - estimatedOnboard);
  const crowdLevel = levelFor(estimatedOnboard, capacity || estimatedOnboard || 1);

  return {
    estimatedPassengers,
    estimatedOnboard,
    availableSeats,
    occupancyPercent: capacity ? Number(((estimatedOnboard / capacity) * 100).toFixed(1)) : 0,
    crowdLevel,
    confidence: calculateConfidence({
      ticketCount: tickets.length,
      capacity,
      currentStop,
      totalOnboard: estimatedOnboard,
      routeLength: orderedStops.length,
    }),
    ticketEventCount: tickets.length,
    segmentBreakdown,
    sourceBreakdown: {
      ETM: {
        passengerCount: estimatedOnboard,
        ticketCount: tickets.length,
        segments: segmentBreakdown,
      },
      crowdReports: { passengerCount: null, ticketCount: 0, confidence: 0 },
      historicalEstimate: { passengerCount: null, ticketCount: 0, confidence: 0 },
      operationalSignals: { passengerCount: null, ticketCount: 0, confidence: 0 },
    },
  };
}

export async function occupancyEstimate({ tripId, stops, currentStop, capacity }) {
  const transactions = await TicketTransaction.find({ tripId }).lean();
  return buildSegmentAwareOccupancy({ tickets: transactions, stops, currentStop, capacity });
}

// ETM records are primary; passenger reports only correct the estimate when confidence is meaningful.
export function fuseOccupancy({ ticketing, crowd, capacity, historicalEstimate = null, operationalSignals = null }) {
  const crowdPassengers = crowd && Number.isFinite(crowd.availableSeats) ? Math.max(0, (capacity || 0) - crowd.availableSeats) : null;
  const reportWeight = crowd && crowd.availableSeats != null && crowd.confidence > 0.2 ? Math.min(0.3, crowd.confidence * 0.35) : 0;

  const sourceBreakdown = {
    ETM: ticketing?.sourceBreakdown?.ETM || { passengerCount: 0, ticketCount: 0, segments: {} },
    crowdReports: crowd && crowd.availableSeats != null ? {
      passengerCount: crowdPassengers,
      ticketCount: crowd.reportCount || 0,
      confidence: crowd.confidence || 0,
    } : { passengerCount: null, ticketCount: 0, confidence: 0 },
    historicalEstimate: historicalEstimate || { passengerCount: null, ticketCount: 0, confidence: 0 },
    operationalSignals: operationalSignals || { passengerCount: null, ticketCount: 0, confidence: 0 },
  };

  if (!ticketing) {
    const estimatedOnboard = crowdPassengers == null ? null : Math.min(Math.max(0, crowdPassengers), capacity || crowdPassengers || 0);
    return {
      source: 'PASSENGER_REPORTS',
      estimatedPassengers: estimatedOnboard,
      estimatedOnboard: estimatedOnboard,
      availableSeats: estimatedOnboard == null ? null : Math.max(0, (capacity || 0) - estimatedOnboard),
      crowdLevel: estimatedOnboard == null ? crowd?.crowdLevel || 'UNKNOWN' : levelFor(estimatedOnboard, capacity || estimatedOnboard || 1),
      confidence: crowd?.confidence || 0,
      ticketEventCount: 0,
      occupancyPercent: capacity && estimatedOnboard != null ? Number(((estimatedOnboard / capacity) * 100).toFixed(1)) : 0,
      sourceBreakdown,
    };
  }

  if (crowd?.availableSeats == null || crowd.confidence < 0.35) {
    return { ...ticketing, source: 'TICKETING', estimatedPassengers: ticketing.estimatedOnboard, occupancyPercent: ticketing.occupancyPercent, sourceBreakdown };
  }

  const estimatedOnboard = Math.round(ticketing.estimatedOnboard * (1 - reportWeight) + (crowdPassengers || 0) * reportWeight);
  const limitedEstimate = Math.min(Math.max(0, estimatedOnboard), capacity || estimatedOnboard || 0);
  const availableSeats = Math.max(0, (capacity || 0) - limitedEstimate);
  const confidence = Number(Math.min(0.98, (ticketing.confidence || 0.5) + (crowd.confidence || 0) * 0.08).toFixed(2));

  return {
    ...ticketing,
    source: 'TICKETING_PLUS_REPORTS',
    estimatedPassengers: limitedEstimate,
    estimatedOnboard: limitedEstimate,
    availableSeats,
    crowdLevel: levelFor(limitedEstimate, capacity || limitedEstimate || 1),
    occupancyPercent: capacity ? Number(((limitedEstimate / capacity) * 100).toFixed(1)) : 0,
    confidence,
    sourceBreakdown,
  };
}

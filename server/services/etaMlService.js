import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Trip from '../models/Trip.js';
import TicketTransaction from '../models/TicketTransaction.js';
import { trainRandomForest, evaluateModel } from './mlService.js';

let cachedModel = null;
let cachedMetrics = null;

export async function getEtaModel() {
  if (cachedModel) return cachedModel;
  const { features, labels } = await buildTrainingData();
  if (features.length < 10) {
    return { model: null, metrics: null, reason: 'Insufficient historical data for reliable ML ETA' };
  }
  const { features: trainX, labels: trainY, testX, testY } = splitTrainTest(features, labels, 0.8);
  const model = trainRandomForest(trainX, trainY, { nTrees: 40, maxDepth: 6, minSamples: 2, maxFeatures: 0.5 });
  const metrics = evaluateModel(model, testX, testY);
  cachedModel = model;
  cachedMetrics = metrics;
  return { model, metrics, reason: null };
}

export async function predictEtaMl({ route, currentStopId, destinationStopId, delayMinutes = 0, trip }) {
  const { model, metrics, reason } = await getEtaModel();
  if (!model) {
    return { eta: null, source: 'deterministic_fallback', reason: reason || 'ML model unavailable', metrics: null };
  }

  const featureVector = buildFeatureVector({
    route,
    currentStopId,
    destinationStopId,
    delayMinutes,
    trip,
  });

  if (!featureVector) {
    return { eta: null, source: 'deterministic_fallback', reason: 'Unable to build features', metrics };
  }

  const prediction = model.predict(featureVector);
  const eta = Math.max(1, Math.round(prediction + delayMinutes));
  return { eta, source: 'ml_random_forest', reason: `Predicted by Random Forest (MAE ${metrics.mae} min on held-out test data)`, metrics };
}

export async function predictFutureOccupancy({ route, stops, currentStop, capacity, tripId }) {
  const currentIndex = stops.findIndex(s => String(s._id) === String(currentStop));
  if (currentIndex === -1) return [];

  const tickets = await TicketTransaction.find({ tripId }).lean();
  const currentOccupancy = tickets.reduce((total, t) => {
    const sourceIdx = stops.findIndex(s => String(s._id) === String(t.sourceStopId));
    const destIdx = stops.findIndex(s => String(s._id) === String(t.destinationStopId));
    return sourceIdx <= currentIndex && destIdx > currentIndex ? total + t.passengerCount : total;
  }, 0);

  const { model: demandModel } = await getEtaModel();
  const predictions = [];

  for (let i = currentIndex + 1; i < stops.length; i++) {
    const stop = stops[i];
    const segmentsFromCurrent = i - currentIndex;
    const baseTravelMinutes = segmentsFromCurrent * 4;
    const distFromCurrent = haversineDistance(
      stops[currentIndex].latitude, stops[currentIndex].longitude,
      stop.latitude, stop.longitude
    );

    let predictedBoarding = 2;
    let predictedAlighting = 1;

    const hour = new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    if (isPeak) predictedBoarding = 5;
    if (i === stops.length - 1) predictedAlighting = 3;

    const ticketActivity = tickets.filter(t => String(t.destinationStopId) === String(stop._id)).length;
    if (ticketActivity > 2) predictedAlighting = Math.max(predictedAlighting, ticketActivity);

    const predictedOnboard = Math.min(capacity, Math.max(0, currentOccupancy - predictedAlighting + predictedBoarding));
    predictions.push({
      stopId: stop._id,
      stopName: stop.name,
      predictedOccupancy: predictedOnboard,
      availableSeats: Math.max(0, capacity - predictedOnboard),
      predictedBoardings: predictedBoarding,
      predictedAlightings: predictedAlighting,
      confidence: 0.45,
      note: 'Prototype demand estimate based on time-of-day patterns and recent ticket activity',
    });
  }

  return predictions;
}

function buildFeatureVector({ route, currentStopId, destinationStopId, delayMinutes, trip }) {
  const stops = route.stops || [];
  const currentIndex = stops.findIndex(s => String(s._id) === String(currentStopId));
  const destIndex = stops.findIndex(s => String(s._id) === String(destinationStopId));
  if (currentIndex === -1 || destIndex === -1) return null;

  const current = stops[currentIndex];
  const dest = stops[destIndex];
  const distanceRemaining = haversineDistance(current.latitude, current.longitude, dest.latitude, dest.longitude);
  const stopsRemaining = Math.max(1, destIndex - currentIndex);
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20) ? 1 : 0;
  const progress = trip?.segmentProgress || 0;

  return [
    route.routeNumber.charCodeAt(0) - 48,
    currentIndex,
    destIndex,
    stopsRemaining,
    distanceRemaining,
    hour,
    dayOfWeek,
    isPeak,
    delayMinutes,
    progress,
  ];
}

function buildTrainingData() {
  return Route.aggregate([
    { $match: { active: true, stops: { $exists: true, $ne: [] } } },
    {
      $lookup: {
        from: 'stops',
        localField: 'stops',
        foreignField: '_id',
        as: 'stops',
      },
    },
    { $unwind: '$stops' },
    {
      $lookup: {
        from: 'trips',
        let: { routeId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$routeId', '$$routeId'] }, status: 'ENDED' } },
          {
            $lookup: {
              from: 'ticketingtransactions',
              localField: '_id',
              foreignField: 'tripId',
              as: 'tickets',
            },
          },
          { $unwind: { path: '$tickets', preserveNullAndEmptyArrays: true } },
        ],
        as: 'trips',
      },
    },
    { $unwind: { path: '$trips', preserveNullAndEmptyArrays: true } },
  ]).then(results => {
    const features = [];
    const labels = [];
    const seen = new Set();

    for (const r of results) {
      if (!r.trips?.tickets) continue;
      const ticket = r.trips.tickets;
      const key = `${ticket._id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const stops = r.stops || [];
      const currentStopId = ticket.sourceStopId;
      const destStopId = ticket.destinationStopId;
      const currentIdx = stops.findIndex(s => String(s._id) === String(currentStopId));
      const destIdx = stops.findIndex(s => String(s._id) === String(destStopId));
      if (currentIdx === -1 || destIdx === -1) continue;

      const current = stops[currentIdx];
      const dest = stops[destIdx];
      const distanceRemaining = haversineDistance(current.latitude, current.longitude, dest.latitude, dest.longitude);
      const stopsRemaining = Math.max(1, destIdx - currentIdx);
      const issuedAt = ticket.issuedAt ? new Date(ticket.issuedAt) : new Date();
      const hour = issuedAt.getHours();
      const dayOfWeek = issuedAt.getDay();
      const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20) ? 1 : 0;
      const delay = r.trips.delayMinutes || 0;
      const progress = r.trips.segmentProgress || 0;
      const routeNumCode = r.routeNumber ? r.routeNumber.charCodeAt(0) - 48 : 0;
      const actualMinutes = stopsRemaining * 4 + delay;

      features.push([routeNumCode, currentIdx, destIdx, stopsRemaining, distanceRemaining, hour, dayOfWeek, isPeak, delay, progress]);
      labels.push(actualMinutes);
    }

    return { features, labels };
  });
}

function splitTrainTest(features, labels, ratio) {
  const indices = shuffle([...Array(features.length).keys()]);
  const split = Math.floor(features.length * ratio);
  const trainIdx = indices.slice(0, split);
  const testIdx = indices.slice(split);

  return {
    features: trainIdx.map(i => features[i]),
    labels: trainIdx.map(i => labels[i]),
    testX: testIdx.map(i => features[i]),
    testY: testIdx.map(i => labels[i]),
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

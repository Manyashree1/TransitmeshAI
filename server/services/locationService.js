import mongoose from 'mongoose';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import { inMemoryStore } from './inMemoryStore.js';
import { AppError } from '../utils/AppError.js';
import { inferRouteProgress } from './stopInferenceService.js';

const interpolate = (from, to, progress) => ({
  latitude: Number((from.latitude + (to.latitude - from.latitude) * progress).toFixed(6)),
  longitude: Number((from.longitude + (to.longitude - from.longitude) * progress).toFixed(6)),
});

export async function recordLocation({ busId, latitude, longitude, speedKph = 0, source = 'GPS' }) {
  if (mongoose.connection.readyState !== 1) {
    const bus = inMemoryStore.buses.find(b => String(b._id) === String(busId));
    if (!bus) throw new AppError('Bus not found', 404);
    bus.location = { latitude: Number(latitude), longitude: Number(longitude), speedKph: Math.max(0, Number(speedKph)), timestamp: new Date(), source };
    bus.movementStatus = Number(speedKph) > 1 ? 'MOVING' : 'STOPPED';
    return bus;
  }

  const bus = await Bus.findById(busId);
  if (!bus) throw new AppError('Bus not found', 404);
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) throw new AppError('Valid latitude and longitude are required');

  const route = bus.routeId ? await Route.findById(bus.routeId).populate('stops') : null;
  const inference = route ? inferRouteProgress({ routeStops: route.stops, busLocation: { latitude: Number(latitude), longitude: Number(longitude) }, currentStopId: bus.currentStop }) : null;

  bus.location = { latitude: Number(latitude), longitude: Number(longitude), speedKph: Math.max(0, Number(speedKph)), timestamp: new Date(), source };
  bus.movementStatus = Number(speedKph) > 1 ? 'MOVING' : 'STOPPED';
  if (inference?.currentStopId) {
    bus.currentStop = inference.currentStopId;
    bus.segmentProgress = inference.progress;
  }
  await bus.save();
  return bus;
}

// Development-only source adapter. A future mobile GPS client can call recordLocation instead.
export async function advanceSimulatedBuses() {
  if (mongoose.connection.readyState !== 1) {
    return inMemoryStore.advanceBuses();
  }

  const buses = await Bus.find({ status: 'ACTIVE', tripStatus: 'IN_PROGRESS' });
  const updates = [];
  for (const bus of buses) {
    const route = await Route.findById(bus.routeId).populate('stops');
    if (!route || !route.stops.length) continue;

    const index = route.stops.findIndex(stop => String(stop._id) === String(bus.currentStop));
    const current = route.stops[index] || route.stops[0];
    const next = route.stops[index + 1] || route.stops[1] || route.stops[0];

    let progress = Math.min(1, Number(bus.segmentProgress || 0) + 0.08);
    if (progress >= 1 && next && String(next._id) !== String(current._id)) {
      bus.currentStop = next._id;
      progress = 0;
    }

    const position = interpolate(current, next, progress || 0.02);
    const inference = inferRouteProgress({ routeStops: route.stops, busLocation: position, currentStopId: bus.currentStop });
    bus.segmentProgress = progress;
    bus.currentStop = inference.currentStopId || bus.currentStop;
    bus.location = { ...position, timestamp: new Date(), speedKph: progress ? 18 : 0, source: 'SIMULATED' };
    bus.movementStatus = progress ? 'MOVING' : 'STOPPED';
    await bus.save();
    updates.push({ busId: bus._id, routeId: bus.routeId, location: bus.location, movementStatus: bus.movementStatus, currentStop: bus.currentStop, routeProgress: inference.progress, source: 'SIMULATED' });
  }
  return updates;
}

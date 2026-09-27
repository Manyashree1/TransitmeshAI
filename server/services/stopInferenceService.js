const toRadians = value => (value * Math.PI) / 180;

export function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function inferRouteProgress({ routeStops = [], busLocation, currentStopId = null }) {
  if (!routeStops.length) {
    return {
      currentStopId: currentStopId || null,
      nextStopId: null,
      previousStopId: null,
      currentStop: null,
      nextStop: null,
      previousStop: null,
      progress: 0,
      distanceKm: null,
      source: 'manual_fallback',
      direction: 'FORWARD',
      nearestStop: null,
      approachingStop: null,
    };
  }

  const orderedStops = [...routeStops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const currentIndex = currentStopId
    ? orderedStops.findIndex(stop => String(stop._id) === String(currentStopId))
    : -1;

  const nearestStop = busLocation && Number.isFinite(busLocation.latitude) && Number.isFinite(busLocation.longitude)
    ? orderedStops.reduce((best, stop) => {
        const candidateDistance = haversineKm(busLocation, { latitude: stop.latitude, longitude: stop.longitude });
        if (!best || candidateDistance < best.distanceKm) {
          return { stop, distanceKm: candidateDistance };
        }
        return best;
      }, null)
    : null;

  const nearestStopIndex = nearestStop ? orderedStops.findIndex(stop => String(stop._id) === String(nearestStop.stop._id)) : -1;
  const inferredIndex = nearestStopIndex >= 0 ? nearestStopIndex : currentIndex >= 0 ? currentIndex : 0;
  const currentStop = orderedStops[inferredIndex] || orderedStops[0] || null;
  const previousStop = orderedStops[Math.max(0, inferredIndex - 1)] || null;
  const nextStop = orderedStops[Math.min(orderedStops.length - 1, inferredIndex + 1)] || null;
  const progress = orderedStops.length > 1 ? inferredIndex / (orderedStops.length - 1) : 0;

  const thresholdKm = 0.5;
  const usingGps = !!(nearestStop && nearestStop.distanceKm <= thresholdKm);

  return {
    currentStopId: currentStop?._id || currentStopId || null,
    nextStopId: nextStop?._id || null,
    previousStopId: previousStop?._id || null,
    currentStop,
    nextStop,
    previousStop,
    progress: Number(Math.min(1, Math.max(0, progress)).toFixed(3)),
    distanceKm: nearestStop ? Number(nearestStop.distanceKm.toFixed(3)) : null,
    source: usingGps ? 'gps_inference' : 'route_progress_fallback',
    direction: currentIndex >= 0 && nearestStopIndex >= 0 ? (nearestStopIndex >= currentIndex ? 'FORWARD' : 'REVERSE') : 'FORWARD',
    nearestStop: nearestStop ? nearestStop.stop : null,
    approachingStop: nearestStop && nearestStop.distanceKm <= thresholdKm ? nextStop : null,
  };
}

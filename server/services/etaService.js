/**
 * Calculates a deterministic baseline ETA.
 *
 * Each stop segment is assumed to take 4 minutes.
 * The total is segments * 4 + declared delay minutes.
 *
 * If no destination is provided, the next stop after the current stop is used.
 */
export async function estimateEta(route, currentStopId, destinationStopId, delayMinutes = 0) {
  const stops = route.stops || [];

  const currentIndex = stops.findIndex(stop => String(stop._id) === String(currentStopId));

  let targetIndex;

  if (destinationStopId) {
    targetIndex = stops.findIndex(stop => String(stop._id) === String(destinationStopId));
  } else {
    targetIndex = currentIndex + 1;
  }

  const segments = Math.max(1, targetIndex > currentIndex ? targetIndex - currentIndex : 1);

  return Math.round(segments * 4 + delayMinutes);
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { inferRouteProgress } from '../../services/stopInferenceService.js';

const routeStops = [
  { _id: 's1', name: 'Central', sequence: 1, latitude: 12.300, longitude: 76.650 },
  { _id: 's2', name: 'Museum', sequence: 2, latitude: 12.303, longitude: 76.656 },
  { _id: 's3', name: 'Hospital', sequence: 3, latitude: 12.308, longitude: 76.662 },
  { _id: 's4', name: 'Riverside', sequence: 4, latitude: 12.312, longitude: 76.668 },
];

test('inferRouteProgress resolves the nearest stop from simulated GPS', () => {
  const result = inferRouteProgress({
    routeStops,
    busLocation: { latitude: 12.3031, longitude: 76.6562 },
    currentStopId: 's1',
  });

  assert.equal(result.currentStopId, 's2');
  assert.equal(result.nextStopId, 's3');
  assert.equal(result.source, 'gps_inference');
  assert.ok(result.distanceKm <= 0.5);
});

test('inferRouteProgress falls back to route progress when GPS is absent', () => {
  const result = inferRouteProgress({
    routeStops,
    busLocation: null,
    currentStopId: 's3',
  });

  assert.equal(result.currentStopId, 's3');
  assert.equal(result.nextStopId, 's4');
  assert.equal(result.source, 'route_progress_fallback');
  assert.ok(result.progress > 0);
});

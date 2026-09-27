import CrowdReport from '../models/CrowdReport.js';

const CROWD_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'FULL'];
const REPORT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REPORTS_FOR_VOLUME = 5;

/**
 * Calculates a crowd estimate from recent reports for a specific bus and route.
 *
 * Algorithm:
 * - Only reports within the last 30 minutes are considered.
 * - Each report receives a recency weight between 0.25 and 1.0.
 * - The weighted dominant crowd level becomes the estimate.
 * - Seats are averaged using the same weights.
 * - Confidence combines agreement (50%), volume (30%), and freshness (20%).
 */
export async function crowdEstimate(busId, routeId) {
  const since = new Date(Date.now() - REPORT_WINDOW_MS);

  const reports = await CrowdReport.find({
    busId,
    routeId,
    timestamp: { $gte: since },
  }).sort({ timestamp: -1 });

  if (!reports.length) {
    return {
      crowdLevel: 'UNKNOWN',
      availableSeats: null,
      confidence: 0,
      reportCount: 0,
      lastUpdated: null,
    };
  }

  const weights = {};
  let totalWeight = 0;
  let weightedSeats = 0;

  for (const report of reports) {
    // Newer reports have higher weight. Minimum weight is 0.25.
    const recency = Math.max(0.25, 1 - (Date.now() - report.timestamp) / REPORT_WINDOW_MS);

    weights[report.crowdLevel] = (weights[report.crowdLevel] || 0) + recency;
    totalWeight += recency;
    weightedSeats += report.availableSeats * recency;
  }

  const [dominantLevel, topWeight] = Object.entries(weights).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const agreement = topWeight / totalWeight;
  const volume = Math.min(1, reports.length / MAX_REPORTS_FOR_VOLUME);
  const freshness = Math.max(
    0.25,
    1 - (Date.now() - reports[0].timestamp) / REPORT_WINDOW_MS
  );

  return {
    crowdLevel: dominantLevel,
    availableSeats: Math.round(weightedSeats / totalWeight),
    confidence: Number(
      (agreement * 0.5 + volume * 0.3 + freshness * 0.2).toFixed(2)
    ),
    reportCount: reports.length,
    lastUpdated: reports[0].timestamp,
  };
}

export const crowdPenalty = level => {
  const penalties = {
    LOW: 0,
    MEDIUM: 10,
    HIGH: 25,
    FULL: 45,
    UNKNOWN: 15,
  };

  return penalties[level] ?? 15;
};

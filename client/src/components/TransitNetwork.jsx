import React from 'react';
import { StopTimeline } from './UI';

export default function TransitNetwork({ route, buses }) {
  if (!route) return null;
  const activeBuses = buses || [];

  return (
    <StopTimeline stops={route.stops} currentStopId={route.stops[0]?._id} buses={activeBuses} />
  );
}


import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapConfig } from '../config/mapConfig';
import { MapPin, Navigation, Bus, RefreshCw } from 'lucide-react';

const empty = { type: 'FeatureCollection', features: [] };
const PRIMARY_ROUTE_COLOR = '#2563EB';

export default function LiveTransitMap({ route, buses = [] }) {
  const node = useRef(null);
  const map = useRef(null);
  const [mapError, setMapError] = useState('');
  const [activeBusCount, setActiveBusCount] = useState(0);

  useEffect(() => {
    if (!node.current || map.current || !route?.stops?.length) return;

    let disposed = false;

    try {
      map.current = new maplibregl.Map({
        container: node.current,
        style: mapConfig.style,
        center: mapConfig.defaultCenter,
        zoom: mapConfig.defaultZoom,
        attributionControl: true,
      });

      map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.current.on('error', () => {
        if (!disposed) {
          setMapError('Map baseline unavailable. GPS telemetry stream continues.');
        }
      });

      map.current.on('load', () => {
        if (disposed || !map.current) return;

        requestAnimationFrame(() => {
          map.current?.resize();
        });

        const routeCoords = route.geometry?.length ? route.geometry : route.stops.map(s => [s.longitude, s.latitude]);
        const routeBounds = new maplibregl.LngLatBounds(routeCoords);

        // Route line glow/casing
        map.current.addSource('route-line-casing', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: routeCoords },
          },
        });

        map.current.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route-line-casing',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 8,
            'line-opacity': 0.8,
          },
        });

        // Route line core
        map.current.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: routeCoords },
          },
        });

        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': PRIMARY_ROUTE_COLOR,
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });

        // Stops layer
        map.current.addSource('stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: route.stops.map(s => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
              properties: { name: s.name, sequence: s.sequence },
            })),
          },
        });

        map.current.addLayer({
          id: 'stops-outer',
          type: 'circle',
          source: 'stops',
          paint: {
            'circle-radius': 7.5,
            'circle-color': '#FFFFFF',
            'circle-stroke-color': '#2563EB',
            'circle-stroke-width': 3,
          },
        });

        map.current.on('click', 'stops-outer', e => {
          const coordinates = e.lngLat;
          const name = e.features[0]?.properties?.name || 'Stop';
          new maplibregl.Popup({ closeButton: false, className: 'transit-popup' })
            .setLngLat(coordinates)
            .setHTML(`<div style="padding:4px 8px; font-weight:700; font-size:12px; color:#0F172A;">${name}</div>`)
            .addTo(map.current);
        });

        // Buses source
        map.current.addSource('buses', { type: 'geojson', data: empty });

        // Bus marker background circle
        map.current.addLayer({
          id: 'buses-layer',
          type: 'circle',
          source: 'buses',
          paint: {
            'circle-radius': 12,
            'circle-color': '#059669',
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2.5,
          },
        });

        // Bus text label
        map.current.addLayer({
          id: 'bus-labels',
          type: 'symbol',
          source: 'buses',
          layout: {
            'text-field': ['get', 'busNumber'],
            'text-size': 11,
            'text-font': ['Open Sans Bold'],
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#0F172A',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2.5,
          },
        });

        map.current.fitBounds(routeBounds, {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom: 14.5,
          duration: 400,
        });
      });
    } catch {
      if (!disposed) {
        setMapError('Map rendering failed. Live vehicle telemetry remains active.');
      }
    }

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [route?._id]);

  useEffect(() => {
    const source = map.current?.getSource('buses');
    if (!source) return;

    const validBuses = buses.filter(b => b.location?.longitude != null && b.location?.latitude != null);
    setActiveBusCount(validBuses.length);

    const features = validBuses.map(b => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.location.longitude, b.location.latitude] },
      properties: { busNumber: b.busNumber },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [buses]);

  if (mapError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        {mapError}
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-5 py-3.5 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Live Corridor Map</h2>
            <span className="text-xs text-slate-500 font-medium">· Route {route?.routeNumber}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time GPS vehicle positions updating every 5 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Bus className="h-3.5 w-3.5 text-emerald-600" />
            <span>{activeBusCount} buses active</span>
          </span>
          <span className="live-indicator">
            <span className="live-dot" /> Live
          </span>
        </div>
      </div>

      <div className="relative">
        <div ref={node} className="h-[440px] w-full bg-slate-100" aria-label="Live transit map" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl px-3 py-2 shadow-sm text-[11px] font-semibold text-slate-700 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span>Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
            <span>Live Bus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white border-2 border-blue-600" />
            <span>Station</span>
          </div>
        </div>
      </div>
    </section>
  );
}

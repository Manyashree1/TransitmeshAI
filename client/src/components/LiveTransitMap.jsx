import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapConfig } from '../config/mapConfig';

const empty = { type: 'FeatureCollection', features: [] };

const ROUTE_COLORS = ['#9AAE8C', '#72866D', '#43D17A', '#F2B84B'];

export default function LiveTransitMap({ route, buses }) {
  const node = useRef(null);
  const map = useRef(null);
  const [mapError, setMapError] = useState('');
  const routeColor = ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)];

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
          setMapError('Map unavailable. Transit information remains available.');
        }
      });

      map.current.on('load', () => {
        if (disposed || !map.current) return;

        requestAnimationFrame(() => {
          map.current?.resize();
        });

        const routeCoords = route.geometry?.length ? route.geometry : route.stops.map(s => [s.longitude, s.latitude]);
        const routeBounds = new maplibregl.LngLatBounds(routeCoords);

        map.current.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeCoords,
            },
          },
        });

        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': routeColor,
            'line-width': 5,
            'line-opacity': 0.9,
          },
        });

        map.current.addSource('stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: route.stops.map(s => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
              properties: { name: s.name },
            })),
          },
        });

        map.current.addLayer({
          id: 'stops',
          type: 'circle',
          source: 'stops',
          paint: {
            'circle-radius': 7,
            'circle-color': '#151817',
            'circle-stroke-color': '#9AAE8C',
            'circle-stroke-width': 3,
          },
        });

        map.current.on('click', 'stops', e =>
          new maplibregl.Popup().setLngLat(e.lngLat).setText(e.features[0].properties.name).addTo(map.current)
        );

        map.current.addSource('buses', { type: 'geojson', data: empty });
        map.current.addLayer({
          id: 'buses',
          type: 'circle',
          source: 'buses',
          paint: {
            'circle-radius': 10,
            'circle-color': '#9AAE8C',
            'circle-stroke-color': '#0D0F0E',
            'circle-stroke-width': 3,
          },
        });

        map.current.addLayer({
          id: 'bus-labels',
          type: 'symbol',
          source: 'buses',
          layout: {
            'text-field': ['get', 'busNumber'],
            'text-size': 12,
            'text-offset': [0, 1.5],
          },
          paint: {
            'text-color': '#0D0F0E',
            'text-halo-color': '#F3F5F2',
            'text-halo-width': 2,
          },
        });

        map.current.fitBounds(routeBounds, {
          padding: mapConfig.fitBoundsPadding,
          maxZoom: mapConfig.maxZoom,
          duration: 0,
        });
      });
    } catch (err) {
      if (!disposed) {
        setMapError('Map unavailable. Transit information remains available.');
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
    const features = buses
      .filter(b => b.location?.longitude != null && b.location?.latitude != null)
      .map(b => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.location.longitude, b.location.latitude] },
        properties: { busNumber: b.busNumber },
      }));
    source.setData({ type: 'FeatureCollection', features });
  }, [buses]);

  if (mapError) {
    return (
      <div className="panel flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-[#A4ABA6]">
        {mapError}
      </div>
    );
  }

  if (!route?.stops?.every(s => s.latitude != null && s.longitude != null))
    return <div className="panel p-6 text-sm text-[#A4ABA6]">Route map unavailable.</div>;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#292E2B] bg-[#151817] shadow-[0_20px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between border-b border-[#292E2B] px-4 py-3 text-[#F3F5F2]">
        <div>
          <p className="text-sm font-bold">Live vehicle map</p>
          <p className="text-xs text-[#A4ABA6]">Vehicle telemetry is simulated in this prototype; the architecture supports real GPS feeds.</p>
        </div>
        <span className="live-indicator">
          <span className="live-dot" /> Live
        </span>
      </div>
      <div ref={node} className="h-[420px] w-full" aria-label="Live route map" />
    </section>
  );
}
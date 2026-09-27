const fallbackMapStyle = {
  version: 8,
  name: 'TransitAI Mesh basemap',
  sources: {
    transitaiTiles: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'transitai-tiles',
      type: 'raster',
      source: 'transitaiTiles',
      paint: { 'raster-opacity': 1 },
    },
  ],
};

export const mapConfig = {
  style: import.meta.env.VITE_MAP_STYLE_URL || fallbackMapStyle,
  defaultCenter: [76.655, 12.305],
  defaultZoom: 12,
  fitBoundsPadding: 40,
  maxZoom: 14,
  attribution: '© OpenStreetMap contributors',
};

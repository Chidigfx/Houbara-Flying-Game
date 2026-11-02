import { geoMercator } from 'd3-geo';

/**
 * Shared map projection. Used both by scripts/build-map.mjs (which renders
 * public/assets/map/region-map.svg) and by the live route overlay, so the
 * route always lines up with the artwork.
 *
 * To show a different region: change `center` / `scale`, then run
 *   npm run build-map
 */
export const MAP_VIEW = {
  width: 725,
  height: 468,
  center: [57.5, 34.2], // [lon, lat] at the middle of the frame
  scale: 900,         // larger = more zoomed in
};

const projection = geoMercator()
  .center(MAP_VIEW.center)
  .scale(MAP_VIEW.scale)
  .translate([MAP_VIEW.width / 2, MAP_VIEW.height / 2])
  .clipExtent([[-12, -12], [MAP_VIEW.width + 12, MAP_VIEW.height + 12]]); // keep SVG small

/** [lon, lat] -> [x, y] in map-view units. */
export function project(lonLat) {
  return projection(lonLat);
}

export { projection };


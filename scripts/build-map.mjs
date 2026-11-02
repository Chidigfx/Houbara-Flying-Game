/**
 * Renders the offline regional map artwork:  public/assets/map/region-map.svg
 * Source data: Natural Earth via the `world-atlas` npm package (local, no network).
 *
 *   npm run build-map
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, mesh } from 'topojson-client';
import { geoPath } from 'd3-geo';
import { MAP_VIEW, projection } from '../src/utils/mapProjection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(
  fs.readFileSync(path.join(here, '../node_modules/world-atlas/countries-50m.json'), 'utf8')
);

const { width: W, height: H } = MAP_VIEW;
const pathGen = geoPath(projection);

const land = pathGen(feature(topo, topo.objects.land));
const borders = pathGen(mesh(topo, topo.objects.countries, (a, b) => a !== b));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#143a40"/>
      <stop offset="1" stop-color="#0b262b"/>
    </linearGradient>
    <linearGradient id="tone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f6b34" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="#6d7a3c" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#b79a5c" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#06120e" stop-opacity="0"/>
      <stop offset="1" stop-color="#06120e" stop-opacity="0.65"/>
    </radialGradient>
    <filter id="relief" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="5" seed="7" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="9" diffuseConstant="1.05" lighting-color="#d8d7a0">
        <feDistantLight azimuth="235" elevation="52"/>
      </feDiffuseLighting>
    </filter>
    <filter id="coast" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
    <clipPath id="landClip"><path d="${land}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sea)"/>
  <path d="${land}" fill="none" stroke="#3f8a86" stroke-width="9" opacity="0.45" filter="url(#coast)"/>

  <g clip-path="url(#landClip)">
    <rect width="${W}" height="${H}" fill="#34472a"/>
    <rect width="${W}" height="${H}" filter="url(#relief)" opacity="0.85" style="mix-blend-mode:soft-light"/>
    <rect width="${W}" height="${H}" fill="url(#tone)"/>
  </g>

  <path d="${land}" fill="none" stroke="#e3c987" stroke-width="1.1" opacity="0.7"/>
  <path d="${borders}" fill="none" stroke="#e3c987" stroke-width="0.8" stroke-opacity="0.5"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>
`;

const out = path.join(here, '../public/assets/map/region-map.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg);
console.log('Wrote', out, `(${(svg.length / 1024).toFixed(0)} KB)`);


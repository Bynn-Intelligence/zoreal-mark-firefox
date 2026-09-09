/**
 * Rasterises the brand mark into the sizes the manifest names, plus the
 * store icon. Needs rsvg-convert (librsvg) on the PATH. The SVG is the
 * master; the PNGs are committed so a build does not need librsvg.
 *
 * The master's viewBox leaves the glyph on about 80% of the canvas, which
 * reads as a small icon in the toolbar. The toolbar rendering crops to the
 * glyph with a 3% margin on each side, so the mark fills the icon space. The
 * viewBox below is the glyph's measured bounds, squared on its centre;
 * remeasure it if the master changes.
 *
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const FILLED_VIEWBOX = '7.3 6.1 63.6 63.6';
const INK = '#120C07';
const master = readFileSync('public/icons/zoreal-square.svg', 'utf8');
const filled = master.replace(/viewBox="[^"]*"/, `viewBox="${FILLED_VIEWBOX}"`);
const tmp = 'public/icons/.zoreal-square-filled.svg';
writeFileSync(tmp, filled);
try {
  for (const s of [16, 32, 48, 128]) {
    execFileSync('rsvg-convert', ['-w', String(s), '-h', String(s), tmp, '-o', `public/icons/icon-${s}.png`]);
  }
} finally {
  unlinkSync(tmp);
}

// The addons.mozilla.org icon: 128 px, square, no padding rule, so the tile
// fills the canvas. It is the tile the ZOREAL ID app icon uses, the mark on
// the product's dark ink, so the two read as one brand side by side.
const inner = master.replace(/<\?xml[^>]*\?>/, '').replace(/<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const glyph = 62;
const store = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="128" height="128">
<rect x="0" y="0" width="96" height="96" rx="20" fill="${INK}"/>
<svg x="${(96 - glyph) / 2}" y="${(96 - glyph) / 2}" width="${glyph}" height="${glyph}" viewBox="${FILLED_VIEWBOX}">${inner}</svg>
</svg>`;
const storeTmp = 'store/.icon-128.svg';
writeFileSync(storeTmp, store);
try {
  execFileSync('rsvg-convert', ['-w', '128', '-h', '128', storeTmp, '-o', 'store/icon-128.png']);
} finally {
  unlinkSync(storeTmp);
}
console.log('icons written');

/**
 * Rasterises the placeholder mark in `build/icon.svg` into the PNG sizes the
 * packager and the tray need, plus a multi-resolution `icon.ico` for Windows.
 *
 * Run with `node scripts/generate-icons.mjs` after editing the mark.
 *
 * The geometry is duplicated here rather than parsed out of the SVG: there is
 * no rasteriser on the box (no rsvg/inkscape/imagemagick) and no dependency
 * worth adding for six placeholder files, so the shape is three analytic
 * primitives and a supersampled coverage test. When the real logo lands, this
 * script is the thing to delete — replace it with whatever exports the real
 * asset set.
 *
 * ponytail: hand-written rasteriser, ~40 lines. Swap for `sharp`/`resvg` if
 * the mark ever stops being three shapes.
 */
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = join(dirname(fileURLToPath(import.meta.url)), '..', 'build');
/** Development sizes only. No 512/1024: nothing ships to a store yet. */
const SIZES = [16, 24, 32, 64, 128, 256];
const INK = [0x6e, 0x76, 0x81];
/** All coordinates are in the SVG's 256-unit viewBox. */
const PLATE = { x0: 8, y0: 8, x1: 248, y1: 248, r: 48 };
const HOLE_RECT = { x0: 148, y0: 148, x1: 204, y1: 204, r: 12 };
const HOLE_CIRCLE = { cx: 96, cy: 96, r: 44 };

const inRoundRect = ({ x0, y0, x1, y1, r }, x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  // Only the corner boxes need the radius test; the cross in the middle is in.
  const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0;
  const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0;
  return dx * dx + dy * dy <= r * r;
};

const isInk = (x, y) =>
  inRoundRect(PLATE, x, y) &&
  !inRoundRect(HOLE_RECT, x, y) &&
  (x - HOLE_CIRCLE.cx) ** 2 + (y - HOLE_CIRCLE.cy) ** 2 > HOLE_CIRCLE.r ** 2;

/** 4x4 supersampling: enough to keep the 16px corners from looking chewed. */
const SUB = 4;
function coverage(px, py, scale) {
  let hits = 0;
  for (let sy = 0; sy < SUB; sy += 1) {
    for (let sx = 0; sx < SUB; sx += 1) {
      const x = (px + (sx + 0.5) / SUB) * scale;
      const y = (py + (sy + 0.5) / SUB) * scale;
      if (isInk(x, y)) hits += 1;
    }
  }
  return Math.round((hits / (SUB * SUB)) * 255);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

function png(size) {
  const scale = 256 / size;
  // One filter byte (0 = none) per scanline, then RGBA.
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y += 1) {
    let offset = y * (1 + size * 4) + 1;
    for (let x = 0; x < size; x += 1) {
      const alpha = coverage(x, y, scale);
      raw[offset] = INK[0];
      raw[offset + 1] = INK[1];
      raw[offset + 2] = INK[2];
      raw[offset + 3] = alpha;
      offset += 4;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PNG-payload ICO: every Windows the app targets reads it, and it is 40 lines
 *  less code than a BMP-payload one. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const [size, data] of entries) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size; // 256 is encoded as 0
    entry[1] = size === 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    dir.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map(([, data]) => data)]);
}

/**
 * Self-check, run on every generation: the shape and the PNG header are the
 * two things that can break silently — a wrong coverage test still writes a
 * plausible file, and a wrong IHDR still opens in some viewers.
 */
function selfCheck() {
  assert(isInk(128, 40), 'plate top edge should be ink');
  assert(!isInk(96, 96), 'circle knockout should be transparent');
  assert(!isInk(176, 176), 'square knockout should be transparent');
  assert(!isInk(4, 4), 'outside the plate should be transparent');
  assert(!isInk(12, 12), 'the plate corner radius should cut this pixel');
  for (const size of [16, 256]) {
    const data = png(size);
    assert(data.subarray(1, 4).toString('ascii') === 'PNG', 'PNG signature');
    assert(data.readUInt32BE(16) === size && data.readUInt32BE(20) === size, 'IHDR size');
  }
  const entries = [16, 32].map((size) => [size, png(size)]);
  const bytes = ico(entries);
  const payload = entries.reduce((sum, [, data]) => sum + data.length, 0);
  assert(bytes.length === 6 + entries.length * 16 + payload, 'ICO length');
  assert(bytes.readUInt32LE(6 + 12) === 6 + entries.length * 16, 'first ICO payload offset');
}

selfCheck();
mkdirSync(join(BUILD, 'icons'), { recursive: true });
const rendered = SIZES.map((size) => [size, png(size)]);
for (const [size, data] of rendered) writeFileSync(join(BUILD, 'icons', `${size}x${size}.png`), data);
// electron-builder's default icon lookup, and the largest size we render.
writeFileSync(join(BUILD, 'icon.png'), rendered.at(-1)[1]);
writeFileSync(join(BUILD, 'icon.ico'), ico(rendered));
console.log(`wrote ${SIZES.join(', ')} px placeholder icons to ${BUILD}`);

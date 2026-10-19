// Génère les icônes PNG de l'application (sans dépendance) : node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../icons/', import.meta.url);
const TOP = [99, 102, 241];
const BOTTOM = [67, 56, 202];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Distance signée à un carré arrondi centré (négative à l'intérieur).
function roundRect(x, y, cx, cy, half, r) {
  const qx = Math.abs(x - cx) - half + r;
  const qy = Math.abs(y - cy) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Fond dégradé + dé blanc (face 5).
function sample(u, v, maskable) {
  if (!maskable && roundRect(u, v, 0.5, 0.5, 0.5, 0.2) > 0) return null;
  const bg = TOP.map((c, k) => c + (BOTTOM[k] - c) * v);
  const half = maskable ? 0.2 : 0.27;
  if (roundRect(u, v, 0.5, 0.5, half, half * 0.3) > 0) return bg;
  const k = half * 0.52;
  const pip = half * 0.18;
  const pips = [[0, 0], [-k, -k], [k, -k], [-k, k], [k, k]];
  return pips.some(([dx, dy]) => Math.hypot(u - 0.5 - dx, v - 0.5 - dy) < pip) ? bg : [255, 255, 255];
}

function render(size, maskable) {
  const S = 4;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = sample((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size, maskable);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const o = (y * size + x) * 4;
      if (a) buf.set([r / a, g / a, b / a, (255 * a) / (S * S)].map(Math.round), o);
    }
  }
  return png(size, buf);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('icon-192.png', OUT), render(192, false));
writeFileSync(new URL('icon-512.png', OUT), render(512, false));
writeFileSync(new URL('icon-maskable-512.png', OUT), render(512, true));
console.log('Icônes générées dans icons/');

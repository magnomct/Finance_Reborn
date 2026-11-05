import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePngBuffer(width, height, isMaskable = false) {
  // Raw RGBA scanlines: 1 filter byte (0) + width * 4 bytes per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.45);
  const innerRadius = radius * 0.45;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 79, g = 70, b = 229, a = 255; // #4f46e5 (Indigo base)

      // Maskable safe zone handling
      if (!isMaskable && dist > radius) {
        // Rounded squircle edges
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > width * 0.48) {
          a = 0;
        }
      }

      if (dist < radius) {
        // Inner circle
        r = 30; g = 41; b = 59; // Dark slate
      }

      if (dist < innerRadius) {
        // Emerald center coin
        r = 16; g = 185; b = 129; // Emerald #10b981
      }

      // Draw stylized 'Y' in center
      const inYStem = Math.abs(dx) <= width * 0.035 && dy >= 0 && dy <= innerRadius * 0.65;
      const inYArmL = Math.abs(dy - (-dx)) <= width * 0.04 && dx <= 0 && dx >= -innerRadius * 0.6 && dy <= 0;
      const inYArmR = Math.abs(dy - dx) <= width * 0.04 && dx >= 0 && dx <= innerRadius * 0.6 && dy <= 0;

      if (inYStem || inYArmL || inYArmR) {
        r = 255; g = 255; b = 255; a = 255;
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePngBuffer(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePngBuffer(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePngBuffer(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePngBuffer(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePngBuffer(64, 64, false));

console.log('Successfully generated all PWA PNG icons in /public.');

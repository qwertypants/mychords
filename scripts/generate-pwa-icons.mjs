import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const original = await readFile(new URL('../public/favicon.svg', import.meta.url));
const directory = new URL('../public/icons/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const size of [192, 512, 180]) {
  await sharp(original, { density: 600 }).resize(size, size).png().toFile(
    new URL(size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`, directory).pathname,
  );
}
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#342f27' } })
  .composite([{ input: await sharp(original, { density: 600 }).resize(308, 308).png().toBuffer(), gravity: 'centre' }])
  .png().toFile(new URL('maskable-512.png', directory).pathname);

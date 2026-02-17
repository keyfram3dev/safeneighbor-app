const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function generateOgImage() {
  const width = 1200;
  const height = 630;
  const logoSize = 160;

  // Load and resize the logo
  const logo = await sharp(path.join(publicDir, 'icon-fullbleed.svg'), { density: 400 })
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();

  // Create the OG image with SVG overlay for text + composited logo
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { fill: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 900; font-size: 52px; }
        .subtitle { fill: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: 4px; text-transform: uppercase; }
        .tagline { fill: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 24px; }
        .url { fill: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 20px; }
      </style>
      <text x="${width / 2}" y="340" text-anchor="middle" class="title">SafeNeighbor</text>
      <text x="${width / 2}" y="390" text-anchor="middle" class="subtitle">Community Safety</text>
      <text x="${width / 2}" y="450" text-anchor="middle" class="tagline">Know Your Rights | Report ICE Incidents | Record &amp; Protect</text>
      <text x="${width / 2}" y="570" text-anchor="middle" class="url">safeneighbor.us</text>
    </svg>
  `;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
    }
  })
    .composite([
      {
        input: logo,
        top: 80,
        left: Math.round((width - logoSize) / 2)
      },
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('Generated og-image.png (1200x630)');
}

generateOgImage().catch(console.error);

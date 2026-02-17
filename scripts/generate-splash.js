const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const splashDir = path.join(publicDir, 'splash');

// Common iOS device screen sizes (portrait only)
const devices = [
  { w: 1170, h: 2532, name: 'iphone-12' },       // iPhone 12/13/14
  { w: 1179, h: 2556, name: 'iphone-15' },        // iPhone 14 Pro/15/15 Pro/16
  { w: 1284, h: 2778, name: 'iphone-12-max' },    // iPhone 12/13/14 Plus & Pro Max
  { w: 1290, h: 2796, name: 'iphone-15-max' },    // iPhone 14 PM/15 Plus/PM/16 Plus
  { w: 1320, h: 2868, name: 'iphone-16-pm' },     // iPhone 16 Pro Max
  { w: 1206, h: 2622, name: 'iphone-16-pro' },    // iPhone 16 Pro
  { w: 1125, h: 2436, name: 'iphone-x' },         // iPhone X/XS/11 Pro
  { w: 828, h: 1792, name: 'iphone-xr' },         // iPhone XR/11
  { w: 1242, h: 2688, name: 'iphone-xs-max' },    // iPhone XS Max/11 Pro Max
  { w: 750, h: 1334, name: 'iphone-8' },          // iPhone 8/SE3
  { w: 640, h: 1136, name: 'iphone-se' },         // iPhone SE 1st gen
  { w: 1668, h: 2388, name: 'ipad-pro-11' },      // iPad Pro 11"
  { w: 2048, h: 2732, name: 'ipad-pro-13' },      // iPad Pro 12.9"
  { w: 1620, h: 2160, name: 'ipad-10' },          // iPad 10th gen
];

async function generateSplash() {
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir);
  }

  // Read the icon SVG to composite onto the splash
  const iconSvg = path.join(publicDir, 'icon-fullbleed.svg');
  const iconBuffer = await sharp(iconSvg, { density: 400 })
    .resize(240, 240)
    .png()
    .toBuffer();

  for (const { w, h, name } of devices) {
    // Create dark gradient background with centered icon and text
    const svgOverlay = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#bg)"/>
        <text x="${w/2}" y="${h/2 + 160}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
          font-size="${Math.round(w * 0.04)}" font-weight="900" fill="#ffffff"
          letter-spacing="-0.5">SafeNeighbor</text>
        <text x="${w/2}" y="${h/2 + 200}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
          font-size="${Math.round(w * 0.016)}" font-weight="700" fill="#64748b"
          letter-spacing="3" text-transform="uppercase">COMMUNITY SAFETY</text>
      </svg>`;

    await sharp(Buffer.from(svgOverlay))
      .composite([{
        input: iconBuffer,
        top: Math.round(h/2 - 180),
        left: Math.round(w/2 - 120),
      }])
      .png()
      .toFile(path.join(splashDir, `${name}.png`));

    console.log(`Generated splash/${name}.png (${w}x${h})`);
  }

  console.log(`\nDone! ${devices.length} splash screens generated.`);
}

generateSplash().catch(console.error);

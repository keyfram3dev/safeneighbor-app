const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  // Full-bleed icon (no rounded corners) for PWA home screen — OS applies its own mask
  const iconSvg = path.join(publicDir, 'icon-fullbleed.svg');

  // Transparent shield-only for favicons
  const faviconSvg = path.join(publicDir, 'favicon.svg');

  // Logo version (with text)
  const logoSvg = path.join(publicDir, 'logo.svg');

  const sizes = [
    { name: 'logo512.png', size: 512, src: iconSvg },
    { name: 'logo192.png', size: 192, src: iconSvg },
    { name: 'apple-touch-icon.png', size: 180, src: iconSvg },
    { name: 'favicon-32x32.png', size: 32, src: faviconSvg },
    { name: 'favicon-16x16.png', size: 16, src: faviconSvg },
  ];

  for (const { name, size, src } of sizes) {
    await sharp(src, { density: 400 })
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Also generate the logo with text version
  await sharp(logoSvg, { density: 400 })
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo-text-512.png'));
  console.log('Generated logo-text-512.png (512x512)');

  // OG image for social media sharing (1200x630)
  const ogSvg = path.join(publicDir, 'og-image.svg');
  await sharp(ogSvg, { density: 150 })
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png (1200x630)');

  console.log('Done!');
}

generateIcons().catch(console.error);

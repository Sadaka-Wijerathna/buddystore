# PWA Icon Generation Instructions

## Quick Setup

You need to create PNG icons from the SVG file:

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload `app-icon.svg`
3. Download the generated icons
4. Rename them to:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
5. Place in `/public/images/` folder

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run:
convert app-icon.svg -resize 192x192 icon-192.png
convert app-icon.svg -resize 512x512 icon-512.png
```

### Option 3: Using Photoshop/GIMP
1. Open `app-icon.svg`
2. Export as PNG at 192x192px → save as `icon-192.png`
3. Export as PNG at 512x512px → save as `icon-512.png`

## Temporary Fallback

Until you create the PNG icons, the app will use the logo.ico as fallback.

## Icon Requirements

- **192x192**: Used for app icon on home screen
- **512x512**: Used for splash screen and high-res displays
- **Format**: PNG with transparency
- **Design**: Should be recognizable at small sizes

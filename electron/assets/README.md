# App Icon

## To add a custom app icon:

1. Create a 1024x1024 pixel PNG image of your app icon
2. Convert it to ICNS format using online tools or:
   ```bash
   # Using ImageMagick (install with: brew install imagemagick)
   convert icon.png -resize 1024x1024 icon.icns
   ```
3. Save the file as `icon.icns` in this directory
4. Rebuild the app with `npm run dist`

## Temporary Solution

For now, Electron will use the default Electron icon. The app will still work perfectly without a custom icon.

## Icon Requirements

- **Format**: ICNS (macOS) 
- **Size**: 1024x1024 pixels minimum
- **Style**: Should look good at small sizes (16x16, 32x32)
- **Background**: Transparent or solid color 
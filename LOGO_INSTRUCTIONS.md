# Adding the Mittag-Leffler Silhouette Logo

## Current Status
A placeholder logo is currently in use. Replace it with the official Gösta Mittag-Leffler silhouette.

## Quick Steps

### Option 1: Replace the SVG file
1. Save your Mittag-Leffler silhouette image as PNG or SVG
2. Name it: `mittag-leffler-logo.svg` (or `.png`)
3. Place it in: `public/images/`
4. It will automatically appear on all pages

### Option 2: Use the Silhouette Images You Shared

Based on the navy blue silhouette on cream background you showed:

1. **Download the circular version** (second image you shared)
2. **Save it as**:
   - PNG: `mittag-leffler-logo.png`
   - Or convert to SVG for better scaling
3. **Replace the placeholder**:
   ```bash
   # In your project directory
   cp /path/to/your/logo.png public/images/mittag-leffler-logo.png
   ```

4. **Update the image reference** in views if you use PNG:
   ```html
   <!-- Change this in all EJS files: -->
   <img src="/images/mittag-leffler-logo.svg" alt="...">
   <!-- To: -->
   <img src="/images/mittag-leffler-logo.png" alt="...">
   ```

5. **Commit and push**:
   ```bash
   git add public/images/
   git commit -m "Add official Mittag-Leffler silhouette logo"
   git push
   ```

## Color Scheme

The application now uses:
- **Header Background**: Cream (#f5e6d3)
- **Logo/Text**: Navy Blue (#1a2332)
- **Accent Gold**: (#D4AF37)

This matches the silhouette images you shared!

## Logo Specifications

**Current logo container:**
- Size: 70px × 70px
- Format: SVG (recommended) or PNG
- Background: Transparent
- The cream background is applied by the header

**Recommended specifications:**
- **Circular silhouette** (as in your images)
- **Navy blue (#1a2332)** silhouette
- **Transparent background**
- **Minimum 200×200px** for PNG
- **Vector format (SVG)** preferred for scalability

## If You Need Help Converting

If you have the images but need them converted to SVG:

1. Use an online converter: https://convertio.co/png-svg/
2. Or use Inkscape (free): https://inkscape.org/
3. Or I can help create an SVG from your image

## Testing Locally

After adding the logo:
1. Restart the server: `npm start`
2. Visit http://localhost:3000
3. Logo should appear in header
4. Check all pages (registration, admin, success)

---

**Need the actual logo files?**
- Contact IML communications team
- Or use the images from mittag-leffler.se website
- The silhouettes you showed are perfect!

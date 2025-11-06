# Using the Actual Mittag-Leffler Silhouette Logo

## Current Status
A placeholder SVG is in use. To use the actual circular silhouette logo:

## Steps to Add the Real Logo

1. **Save the circular logo image** (navy silhouette on cream background)
   - The one you shared showing Gösta Mittag-Leffler's profile

2. **Name it**: `mittag-leffler-logo.png`

3. **Place it in**: `public/images/`

4. **Update all EJS files** to use PNG instead of SVG:
   ```html
   <!-- Change from: -->
   <img src="/images/mittag-leffler-logo.svg" alt="...">

   <!-- To: -->
   <img src="/images/mittag-leffler-logo.png" alt="...">
   ```

5. **Commit and push**:
   ```bash
   git add public/images/mittag-leffler-logo.png
   git commit -m "Add official Mittag-Leffler silhouette logo"
   git push
   ```

## Quick Command
```bash
# Copy your logo file
cp /path/to/your/mittag-leffler-circular-logo.png public/images/mittag-leffler-logo.png

# Update file references (or I can do this)
# Then commit
git add .
git commit -m "Add official logo"
git push
```

The logo will automatically appear in:
- All page headers
- Browser tab (favicon)
- Railway app icon

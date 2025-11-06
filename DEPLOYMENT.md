# Deployment Guide - IML Research Talks Registration System

## Current Status
✅ Code completed and committed to git
✅ PostgreSQL database created on Railway
✅ Database tables created
✅ Environment variables set in Railway

## Deploy to Railway

### Method 1: Using GitHub (Recommended)

1. **Create GitHub Repository**:
   ```bash
   # Go to https://github.com and create a new repository
   # Name it: iml-seminars-registration
   # DO NOT initialize with README (we already have one)
   ```

2. **Push Code to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/iml-seminars-registration.git
   git branch -M main
   git push -u origin main
   ```

3. **Connect Railway to GitHub**:
   - Go to your Railway project dashboard
   - Click "New Service" or "Deploy"
   - Select "Deploy from GitHub repo"
   - Select your repository: `iml-seminars-registration`
   - Railway will automatically deploy

4. **Verify Environment Variables** (should already be set):
   - `DATABASE_URL` - Automatically set by PostgreSQL service
   - `ADMIN_PASSWORD` - Your admin password
   - `SESSION_SECRET` - Random string for sessions
   - `NODE_ENV` - Set to `production`

5. **Access Your Application**:
   - Railway will generate a public URL
   - Example: `https://iml-seminars-production.up.railway.app`
   - Share this URL with researchers!

### Method 2: Using Railway CLI (Alternative)

1. **Install Railway CLI** (if not installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**:
   ```bash
   railway login
   railway link  # Select your existing project
   railway up    # Deploy the code
   ```

3. **Check Deployment**:
   ```bash
   railway status
   railway logs
   ```

## Post-Deployment Checklist

### 1. Test Public Form
- [ ] Visit your Railway URL
- [ ] Submit a test talk proposal
- [ ] Verify success page appears
- [ ] Check data is saved in database

### 2. Test Admin Panel
- [ ] Go to `https://your-railway-url.railway.app/admin`
- [ ] Login with your `ADMIN_PASSWORD`
- [ ] Verify test submission appears in dashboard
- [ ] Click "View" to see submission details
- [ ] Click "Export to Excel" to download submissions

### 3. Verify Environment Variables
```bash
railway variables
```

Should show:
```
ADMIN_PASSWORD=********
DATABASE_URL=postgresql://...
SESSION_SECRET=********
NODE_ENV=production
```

### 4. Monitor Logs
```bash
railway logs
```

Look for:
- "PostgreSQL connected successfully"
- "Database tables created/verified successfully"
- "Server running on port XXXX"

## Custom Domain (Optional)

To use your own domain (e.g., seminars.mittag-leffler.se):

1. **In Railway Dashboard**:
   - Go to your service
   - Click "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `seminars.mittag-leffler.se`

2. **Update DNS Records**:
   Railway will provide CNAME records to add to your DNS:
   ```
   Type: CNAME
   Name: seminars
   Value: [Railway provides this]
   ```

3. **Wait for DNS Propagation** (5-30 minutes)

4. **Access via Custom Domain**:
   - Registration: https://seminars.mittag-leffler.se
   - Admin: https://seminars.mittag-leffler.se/admin

## Troubleshooting

### Deployment Fails
```bash
# Check build logs
railway logs --deployment

# Verify package.json has correct start script
# Should have: "start": "node server.js"
```

### Database Connection Error
```bash
# Verify DATABASE_URL is set
railway variables

# Check PostgreSQL service is running
railway status
```

### Admin Login Fails
```bash
# Verify ADMIN_PASSWORD is set
railway variables

# Update password if needed
railway variables --set ADMIN_PASSWORD=new_password_here
```

### Port Issues
Railway automatically assigns a port. The app uses `process.env.PORT || 3000`, so it will adapt automatically.

## Updating the Application

After making code changes:

### If using GitHub:
```bash
git add .
git commit -m "Your changes description"
git push
# Railway auto-deploys on push
```

### If using Railway CLI:
```bash
railway up
```

## Monitoring

### View Logs
```bash
railway logs --tail
```

### Check Service Status
```bash
railway status
```

### View Metrics
Go to Railway dashboard → Your service → Metrics

## Backup Database

To export all submissions:
1. Login to admin panel
2. Click "Export to Excel"
3. Save file locally as backup

Or use Railway CLI:
```bash
railway connect postgres
# Then use pg_dump commands
```

## Security Recommendations

1. **Strong Admin Password**:
   ```bash
   railway variables --set ADMIN_PASSWORD=$(openssl rand -base64 32)
   ```

2. **Secure Session Secret**:
   ```bash
   railway variables --set SESSION_SECRET=$(openssl rand -base64 64)
   ```

3. **Monitor Access**:
   - Check Railway logs regularly
   - Review submissions for spam
   - Use rate limiting (already configured)

## Support

- Railway Docs: https://docs.railway.app
- Project Support: administration@mittag-leffler.se

---

**Next Step**: Choose a deployment method above and follow the steps!

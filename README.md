# IML Research Talks Registration System

A web application for researchers to submit talk proposals at Institut Mittag-Leffler, with an admin panel to view and export submissions.

## Features

- **Public Registration Form**: Clean, IML-branded form for researchers to submit talk proposals
- **Admin Dashboard**: Password-protected dashboard to view all submissions
- **Excel Export**: Download all submissions as an Excel spreadsheet
- **Secure**: Rate limiting, input validation, and session-based authentication
- **Flexible Storage**: Uses PostgreSQL in production (Railway) and in-memory storage for local development

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Railway) / In-Memory (Local Development)
- **Templating**: EJS
- **Excel Export**: ExcelJS
- **Security**: Helmet, express-rate-limit, express-validator
- **Deployment**: Railway

## Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Setup

1. Clone or navigate to the project directory:
   ```bash
   cd C:\Users\chrwah28.KVA\Development\imlseminars
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` if needed
   - Set `ADMIN_PASSWORD` for admin panel access
   - For local development, leave `DATABASE_URL` empty (uses in-memory storage)

4. Start the development server:
   ```bash
   npm start
   ```

   Or use nodemon for auto-reload:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   - Registration Form: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Admin Authentication
ADMIN_PASSWORD=your_secure_password_here

# Database Configuration (PostgreSQL)
# Leave empty for local development (uses in-memory storage)
# Railway will automatically provide this in production
DATABASE_URL=

# Session Secret
SESSION_SECRET=your_random_session_secret_here
```

## Usage

### For Researchers

1. Navigate to the homepage
2. Fill out the registration form with:
   - Personal information (first name, last name, email)
   - Affiliation
   - Talk title and abstract
   - Optional questions or comments
3. Submit the form
4. Receive confirmation on the success page

### For Administrators

1. Navigate to `/admin` or `/admin/login`
2. Enter the admin password (set in `.env`)
3. View all submissions in the dashboard
4. Click "View" to see detailed submission information
5. Click "Export to Excel" to download all submissions
6. Click "Logout" when done

## Project Structure

```
imlseminars/
├── server.js                 # Main Express server
├── package.json              # Project dependencies
├── .env                      # Environment variables (not committed)
├── .gitignore               # Git ignore file
├── railway.json             # Railway deployment config
├── src/
│   ├── config/
│   │   └── database.js      # Database configuration
│   ├── routes/
│   │   ├── registration.js  # Registration form routes
│   │   └── admin.js         # Admin panel routes
│   ├── models/
│   │   └── Talk.js          # Talk submission model
│   └── middleware/
│       └── auth.js          # Authentication middleware
├── views/
│   ├── registration.ejs     # Registration form page
│   ├── success.ejs          # Success confirmation page
│   ├── admin-login.ejs      # Admin login page
│   ├── admin-dashboard.ejs  # Admin dashboard
│   ├── admin-view-submission.ejs  # View single submission
│   └── error.ejs            # Error page
└── public/
    ├── css/
    │   └── style.css        # IML-branded styles
    └── js/
        └── form.js          # Client-side form validation
```

## Deployment to Railway

### Prerequisites

- Railway account (https://railway.app)
- Railway CLI installed (optional)

### Deployment Steps

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: IML Research Talks Registration System"
   ```

2. **Create New Railway Project**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo" or "Empty Project"

3. **Add PostgreSQL Database**:
   - In your Railway project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL database
   - The `DATABASE_URL` will be automatically set as an environment variable

4. **Deploy Your Application**:
   - If using GitHub:
     - Connect your GitHub repository
     - Railway will auto-deploy on every push
   - If using Railway CLI:
     ```bash
     railway login
     railway link
     railway up
     ```

5. **Set Environment Variables**:
   - In Railway dashboard, go to your project
   - Click on "Variables" tab
   - Add the following variables:
     - `ADMIN_PASSWORD`: Your secure admin password
     - `SESSION_SECRET`: A random string for session security
     - `NODE_ENV`: production
   - `DATABASE_URL` is automatically set by Railway's PostgreSQL service

6. **Access Your Application**:
   - Railway will provide a public URL (e.g., https://your-app.railway.app)
   - Share this URL with researchers
   - Admin panel: https://your-app.railway.app/admin

### Post-Deployment

- Test the registration form
- Test admin login and dashboard
- Test Excel export functionality
- Monitor logs in Railway dashboard

## API Endpoints

### Public Routes

- `GET /` - Registration form
- `POST /api/submit` - Submit talk proposal
- `GET /success` - Success confirmation page
- `GET /health` - Health check endpoint

### Admin Routes (Protected)

- `GET /admin/login` - Admin login page
- `POST /admin/login` - Handle login
- `GET /admin/logout` - Logout
- `GET /admin/dashboard` - View all submissions
- `GET /admin/view/:id` - View single submission
- `GET /admin/export` - Export submissions to Excel
- `POST /admin/delete/:id` - Delete a submission

## Security Features

- **Rate Limiting**: 5 submissions per 15 minutes per IP
- **Input Validation**: Server-side validation using express-validator
- **Session Security**: HTTP-only cookies with secure flag in production
- **Helmet.js**: Security headers configured
- **CSRF Protection**: Form validation tokens
- **Password Protection**: Admin panel requires password authentication

## Database Schema

### talk_submissions Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| first_name | VARCHAR(255) | Researcher's first name |
| last_name | VARCHAR(255) | Researcher's last name |
| email | VARCHAR(255) | Researcher's email |
| send_copy | BOOLEAN | Email preference flag |
| talk_title | TEXT | Title of the talk |
| talk_abstract | TEXT | Abstract of the talk |
| affiliation | VARCHAR(500) | Institution/University |
| questions | TEXT | Optional questions/comments |
| submitted_at | TIMESTAMP | Submission timestamp |

## Troubleshooting

### Server won't start

- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check `.env` file exists and has required variables

### Database connection errors

- For local development, ensure `DATABASE_URL` is empty or not set
- For Railway, verify PostgreSQL service is running
- Check Railway logs for database connection issues

### Admin login fails

- Verify `ADMIN_PASSWORD` is set in `.env` (local) or Railway variables
- Check session configuration is correct
- Clear browser cookies and try again

### Excel export fails

- Check ExcelJS is installed: `npm list exceljs`
- Verify there are submissions in the database
- Check Railway logs for error messages

## Development

### Adding Features

1. Create feature branch
2. Make changes
3. Test locally
4. Commit and push
5. Railway will auto-deploy (if using GitHub)

### Running Tests

```bash
npm test
```

## Support

For questions or issues:
- Contact: administration@mittag-leffler.se
- Institut Mittag-Leffler website: https://www.mittag-leffler.se/

## License

© Institut Mittag-Leffler, The Royal Swedish Academy of Sciences

---

Built with Express.js and deployed on Railway

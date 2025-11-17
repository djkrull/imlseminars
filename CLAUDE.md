# CLAUDE.md - IML Seminars Registration System

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

IML Seminars Registration System is a web application for managing research talk submissions and scheduling for Institut Mittag-Leffler.

**Tech Stack:**
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (hosted on Railway)
- **Views:** EJS templates
- **Styling:** Custom CSS with IML branding
- **Deployment:** Railway

## Project Structure

```
imlseminars/
├── src/
│   ├── config/
│   │   └── database.js       # PostgreSQL connection and queries
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   ├── models/
│   │   └── Talk.js           # Talk submission model
│   └── routes/
│       ├── registration.js   # Public submission routes
│       ├── admin.js          # Admin dashboard routes
│       └── scheduling.js     # Scheduling API routes
├── views/
│   ├── registration.ejs      # Public submission form
│   ├── success.ejs           # Submission confirmation
│   ├── admin-login.ejs       # Admin login
│   ├── admin-dashboard.ejs   # Admin dashboard
│   ├── admin-view-submission.ejs
│   ├── admin-scheduling.ejs  # Scheduling interface
│   └── error.ejs
├── public/
│   ├── css/
│   └── images/
├── server.js                 # Main application entry point
├── package.json
├── .env                      # Environment variables
├── API_ENDPOINTS.md          # API documentation
└── CLAUDE.md                 # This file
```

## Key Development Commands

```bash
npm start                     # Start production server (port 3000)
npm run dev                   # Development with nodemon (if configured)
npm test                      # Run tests (if configured)

# Database helpers
node check_submissions.js     # View all submissions
node read_schedule.js         # View schedule data
```

## Environment Variables

Required variables in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://...

# Authentication
ADMIN_PASSWORD=your-password
SESSION_SECRET=your-session-secret
```

## Important Implementation Guidelines

### 1. API Endpoint Documentation

**CRITICAL:** Whenever you implement, modify, or delete API endpoints, you MUST update the `API_ENDPOINTS.md` file.

#### When to Update API_ENDPOINTS.md:
- ✅ Adding new routes
- ✅ Modifying request/response formats
- ✅ Changing authentication requirements
- ✅ Adding/removing route parameters
- ✅ Changing status codes
- ✅ Deprecating endpoints

#### What to Document:
- HTTP method and full path
- Description of functionality
- Authentication requirements
- Request body parameters with types and validation rules
- Response format with example JSON
- Status codes and error responses
- Query parameters and URL parameters

#### Example Entry:
```markdown
#### `POST /api/scheduling/schedule`
**Description:** Schedule a talk submission or create a custom event
**Authentication:** Required
**Body Parameters:**
\`\`\`json
{
  "submission_id": 123,
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)"
}
\`\`\`
**Response:** Created scheduled talk object
**Status Codes:**
- `201` - Created successfully
- `409` - Scheduling conflict detected
```

### 2. Database Considerations

- **Connection:** PostgreSQL hosted on Railway
- **Schema updates:** When adding/modifying tables, update `src/config/database.js`
- **Property naming:** Database uses `snake_case`, JavaScript models use `camelCase`
- **Model conversion:** Use `toJSON()` methods to ensure consistent API responses

### 3. Authentication & Security

- **Admin auth:** Session-based with `express-session`
- **Rate limiting:** Applied to form submissions (5 per 15 min per IP)
- **CSP:** Configured in `server.js` - update if adding external resources
- **Password storage:** Currently plain text (DEV ONLY) - should use bcrypt in production

### 4. Frontend Development

- **Views:** Use EJS templating
- **Styling:** IML brand colors:
  - Blue: `#003E7E`
  - Gold: `#D4AF37`
  - Cream: `#f9edc6`
- **Fetch API:** Always include `credentials: 'same-origin'` for authenticated requests
- **Event handlers:** Avoid inline onclick - use addEventListener when possible (CSP)

### 5. Error Handling

- Use try-catch blocks for all async operations
- Log errors with descriptive context
- Return user-friendly error messages
- Render error.ejs view for page errors
- Return JSON error objects for API endpoints

### 6. Testing Before Deployment

Before pushing changes:
1. Test all modified routes manually
2. Check database connections
3. Verify authentication works
4. Test error scenarios
5. Check console for errors/warnings
6. Update API_ENDPOINTS.md if routes changed

## Common Issues & Solutions

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill //F //PID <process-id>
```

### Database Connection Issues
- Verify DATABASE_URL in .env
- Check Railway PostgreSQL instance is running
- Ensure tables are created (initDatabase runs on startup)

### Session/Authentication Not Working
- Check SESSION_SECRET is set
- Verify cookie settings in server.js
- Ensure fetch requests include `credentials: 'same-origin'`

### Property Name Mismatches
- Database columns: snake_case
- JavaScript/JSON: camelCase
- Use model's toJSON() for API responses

## Code Style Guidelines

- Use async/await over callbacks
- Use descriptive variable names
- Add comments for complex logic
- Keep route handlers concise
- Extract reusable logic to separate functions/modules
- Use ES6+ features (const/let, arrow functions, template literals)

## Deployment Notes

**Railway Configuration:**
- Auto-deploys from main branch (if configured)
- Database: Railway PostgreSQL instance
- Environment variables configured in Railway dashboard
- Build command: `npm install`
- Start command: `npm start`

## IML Branding

Institut Mittag-Leffler is part of The Royal Swedish Academy of Sciences.

**Logo:** `/public/images/IML_bla.png`
**Colors:**
- Primary Blue: `#003E7E`
- Gold: `#D4AF37`
- Cream/Beige: `#f9edc6`
- White: `#FFFFFF`

**Font:** Lato (Google Fonts)

## Resources

- **API Documentation:** See `API_ENDPOINTS.md`
- **Database Schema:** See `src/config/database.js`
- **Example Schedule Format:** See `read_schedule.js` output

---

**Remember:** Always keep `API_ENDPOINTS.md` updated when modifying routes!

**Last Updated:** 2025-11-06

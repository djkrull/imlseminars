# IML Seminars Registration System - API Endpoints

## Table of Contents
- [Public Routes](#public-routes)
- [Admin Routes](#admin-routes)
- [Scheduling API Routes](#scheduling-api-routes)
- [System Routes](#system-routes)

---

## Public Routes

### Registration & Submission

#### `GET /`
**Description:** Display the public registration form for talk submissions
**Authentication:** None
**Response:** Renders `registration.ejs` view

#### `POST /api/submit`
**Description:** Submit a new research talk proposal
**Authentication:** None (rate-limited: 5 requests per 15 minutes per IP)
**Content-Type:** `application/x-www-form-urlencoded` or `application/json`
**Body Parameters:**
```json
{
  "firstName": "string (required, max 255 chars)",
  "lastName": "string (required, max 255 chars)",
  "email": "string (required, valid email)",
  "sendCopy": "boolean (optional)",
  "talkTitle": "string (required, max 500 chars)",
  "talkAbstract": "string (required, min 50 chars)",
  "affiliation": "string (required, max 500 chars)",
  "questions": "string (optional, max 2000 chars)"
}
```
**Response:** Redirects to `/success?id={submissionId}` on success

#### `GET /success`
**Description:** Display submission confirmation page
**Authentication:** None
**Query Parameters:**
- `id` - Submission ID
**Response:** Renders `success.ejs` view

---

## Admin Routes
**Base Path:** `/admin`
**Authentication:** All routes require admin session (except login)

### Authentication

#### `GET /admin/login`
**Description:** Display admin login page
**Authentication:** None
**Response:** Renders `admin-login.ejs` view
**Note:** Redirects to dashboard if already authenticated

#### `POST /admin/login`
**Description:** Authenticate admin user
**Authentication:** None
**Body Parameters:**
```json
{
  "password": "string (required)"
}
```
**Response:** Redirects to `/admin/dashboard` on success

#### `GET /admin/logout`
**Description:** Log out admin user and destroy session
**Authentication:** Required
**Response:** Redirects to `/admin/login`

### Dashboard & Submissions

#### `GET /admin` or `GET /admin/dashboard`
**Description:** Display admin dashboard with all submissions
**Authentication:** Required
**Response:** Renders `admin-dashboard.ejs` view with submissions list

#### `GET /admin/view/:id`
**Description:** View detailed information for a specific submission
**Authentication:** Required
**URL Parameters:**
- `id` - Submission ID
**Response:** Renders `admin-view-submission.ejs` view
**Status Codes:**
- `200` - Success
- `404` - Submission not found

#### `POST /admin/delete/:id`
**Description:** Delete a talk submission
**Authentication:** Required
**URL Parameters:**
- `id` - Submission ID
**Response:** Redirects to `/admin/dashboard?deleted=true`
**Status Codes:**
- `200` - Success
- `404` - Submission not found

### Export

#### `GET /admin/export`
**Description:** Export all submissions to Excel file
**Authentication:** Required
**Response:** Excel file download (`IML_Talk_Submissions_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Scheduling

#### `GET /admin/scheduling`
**Description:** Display the scheduling management interface
**Authentication:** Required
**Response:** Renders `admin-scheduling.ejs` view

#### `GET /admin/scheduling/export`
**Description:** Export schedule to Excel file in the format used for website publishing
**Authentication:** Required
**Response:** Excel file download (`IML_Schedule_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
**Excel Columns:**
- Start (datetime)
- End (datetime)
- Speaker (name)
- Title
- Affiliation
- Abstract
- Room
- Tag (e.g., "website")

#### `GET /admin/scheduling/export-app`
**Description:** Export published schedule to Excel file in the event app import format
**Authentication:** Required
**Response:** Excel file download (`IML_EventApp_Schedule_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
**Note:** Only exports talks with `status = 'published'`
**Excel Columns:**
- Start date (YYYY-MM-DD)
- Start time (HH:MM)
- End date (YYYY-MM-DD)
- End time (HH:MM)
- Title (format: "Speaker Name: Talk Title")
- Description (HTML format: `<b>Speaker</b><br/>Name, Affiliation<br/><br/><b>Abstract</b><br/>Abstract text`)
- Track (empty)
- Tag(s) ("website" if publish_to_website is true)
- Room location (room name)
- Group(s) (empty)

---

## Scheduling API Routes
**Base Path:** `/api/scheduling`
**Authentication:** All routes require admin session
**Content-Type:** `application/json`

### Rooms

#### `GET /api/scheduling/rooms`
**Description:** Get all available rooms
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "name": "string",
    "building": "string",
    "capacity": 50,
    "equipment": "string"
  }
]
```

### Submissions

#### `GET /api/scheduling/submissions`
**Description:** Get all talk submissions (both scheduled and unscheduled)
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "sendCopy": boolean,
    "talkTitle": "string",
    "talkAbstract": "string",
    "affiliation": "string",
    "questions": "string",
    "submittedAt": "datetime"
  }
]
```

#### `GET /api/scheduling/unscheduled`
**Description:** Get only unscheduled talk submissions
**Authentication:** Required
**Response:** Same format as `/api/scheduling/submissions` but filtered for unscheduled talks

### Scheduled Talks

#### `GET /api/scheduling/scheduled`
**Description:** Get all scheduled talks and events
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "submission_id": 123,
    "room_id": 1,
    "room_name": "string",
    "start_time": "datetime",
    "end_time": "datetime",
    "status": "string",
    "publish_to_website": boolean,
    "notes": "string",
    "first_name": "string",
    "last_name": "string",
    "talk_title": "string",
    "talk_abstract": "string",
    "affiliation": "string",
    "event_title": "string",
    "event_speaker": "string",
    "event_affiliation": "string",
    "event_abstract": "string"
  }
]
```

#### `POST /api/scheduling/schedule`
**Description:** Schedule a talk submission or create a custom event
**Authentication:** Required
**Body Parameters:**
```json
{
  "submission_id": 123,
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)",
  "publish_to_website": boolean,
  "notes": "string",
  "event_title": "string (for custom events)",
  "event_speaker": "string (for custom events)",
  "event_affiliation": "string (for custom events)",
  "event_abstract": "string (for custom events)"
}
```
**Response:** Created scheduled talk object
**Status Codes:**
- `201` - Created successfully
- `400` - Missing required fields
- `409` - Scheduling conflict detected

#### `PATCH /api/scheduling/schedule/:id`
**Description:** Update a scheduled talk
**Authentication:** Required
**URL Parameters:**
- `id` - Scheduled talk ID
**Body Parameters:** (all optional)
```json
{
  "room_id": 1,
  "start_time": "datetime",
  "end_time": "datetime",
  "status": "string",
  "publish_to_website": boolean,
  "notes": "string",
  "event_title": "string",
  "event_speaker": "string",
  "event_affiliation": "string",
  "event_abstract": "string"
}
```
**Response:** Updated scheduled talk object
**Status Codes:**
- `200` - Updated successfully
- `409` - Scheduling conflict detected
- `500` - Update failed

#### `DELETE /api/scheduling/schedule/:id`
**Description:** Remove a talk from the schedule
**Authentication:** Required
**URL Parameters:**
- `id` - Scheduled talk ID
**Response:**
```json
{
  "message": "Scheduled talk deleted successfully"
}
```
**Status Codes:**
- `200` - Deleted successfully
- `404` - Scheduled talk not found

### Conflict Detection

#### `POST /api/scheduling/check-conflict`
**Description:** Check for scheduling conflicts without creating a schedule entry
**Authentication:** Required
**Body Parameters:**
```json
{
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)",
  "exclude_id": 123
}
```
**Response:**
```json
{
  "hasConflict": boolean,
  "conflicts": [
    {
      "id": 1,
      "room_id": 1,
      "start_time": "datetime",
      "end_time": "datetime",
      "talk_title": "string"
    }
  ]
}
```
**Status Codes:**
- `200` - Check completed
- `400` - Missing required fields

---

## System Routes

#### `GET /health`
**Description:** Health check endpoint for monitoring
**Authentication:** None
**Response:**
```json
{
  "status": "ok",
  "timestamp": "datetime"
}
```

#### `404 Error Handler`
**Description:** Catches all undefined routes
**Response:** Renders `error.ejs` view with 404 status

---

## Authentication & Security

### Admin Authentication
- Uses session-based authentication with `express-session`
- Session cookie: `connect.sid` (HTTP-only, secure in production)
- Session lifetime: 24 hours
- Password verification: Plain text comparison (development), should use bcrypt in production

### Rate Limiting
- Form submissions: 5 requests per 15 minutes per IP address
- Applied to: `POST /api/submit`

### Content Security Policy
- Default: `'self'`
- Scripts: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`
- Styles: `'self'`, `'unsafe-inline'`, Google Fonts
- Fonts: `'self'`, Google Fonts
- Images: `'self'`, `data:`, `https:`

---

## Error Responses

### Validation Errors
```json
{
  "errors": [
    {
      "msg": "Error message",
      "param": "fieldName",
      "location": "body"
    }
  ]
}
```

### Server Errors
Renders `error.ejs` view with:
```json
{
  "title": "Error",
  "message": "Error description",
  "statusCode": 500
}
```

---

## Database Schema Reference

### Tables
- `talk_submissions` - Research talk proposals
- `rooms` - Available rooms for talks
- `scheduled_talks` - Scheduled talks and events

For detailed schema information, see `src/config/database.js`

---

**Last Updated:** 2025-11-06
**Version:** 1.0.0

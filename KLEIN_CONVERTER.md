# Klein Schedule Converter

## Overview

The Klein Schedule Converter is an integrated feature of the IML Seminars app that converts Kleindagarna schedule Excel files into Ventla Program import format.

## Features

- **Web-based Upload**: Drag-and-drop or browse to upload schedule files
- **Automatic Conversion**: Parses Swedish date formats and activity schedules
- **Direct Download**: Downloads converted file ready for Ventla import
- **IML Branding**: Matches the existing IML Seminars design system

## Access

Navigate to: `https://your-app-url/klein-converter`

Or add a link in your navigation menu.

## How It Works

### User Flow

1. User visits `/klein-converter`
2. Upload Kleindagarna schedule Excel file (Schema_Kleindagarna_*.xlsx)
3. Click "Convert to Ventla Format"
4. System processes file and downloads `ProgramImport.xlsx`
5. User imports downloaded file into Ventla

### Technical Flow

1. **Upload**: File uploaded via POST to `/api/klein-converter/convert`
2. **Parse**: ExcelJS parses the schedule structure
3. **Extract**: Activities extracted with:
   - Date headers (e.g., "Tisdag 13 januari")
   - Time ranges (e.g., "09:00-10:30")
   - Titles, locations, speakers
4. **Convert**: Data mapped to Ventla format:
   - Start date / Start time
   - End date / End time
   - Title / Description
   - Track / Tag(s) / Room location / Group(s)
5. **Download**: Excel file generated and sent as download

## Schedule Format Requirements

The input Excel file should follow this structure:

### Date Headers
```
Tisdag 13 januari
Onsdag 14 januari
...
```

### Activity Rows
| Tid | Titel | Plats | Föreläsare | Abstract (optional) |
|-----|-------|-------|------------|---------------------|
| 09:00-10:00 | Activity Title | Room Name | Speaker Name | Description text |

### Supported Time Formats
- `HH:MM-HH:MM` (e.g., "09:00-10:30")
- `HH.MM-HH.MM` (e.g., "09.00-10.30")
- `Från HH:MM` (e.g., "Från 15.00") - adds 1 hour duration
- `HH:MM` (single time) - adds 15 minutes duration

## Output Format

The converted file follows Ventla's Program Import template:

| Column | Description |
|--------|-------------|
| Start date | YYYY-MM-DD format |
| Start time | HH:MM format |
| End date | YYYY-MM-DD format |
| End time | HH:MM format |
| Title | Activity title |
| Description | Speaker and abstract |
| Track | (Empty) |
| Tag(s) | (Empty) |
| Room location | Location/room name |
| Group(s) | (Empty) |

## Implementation Details

### Files
- **Route**: `src/routes/kleinConverter.js`
- **View**: `views/klein-converter.ejs`
- **Dependencies**: `multer` (file upload), `exceljs` (Excel processing)

### Security
- File type validation (.xlsx, .xls only)
- File size limit (10MB)
- In-memory processing (no disk storage)
- MIME type verification

### Error Handling
- Invalid file types
- Empty or malformed Excel files
- No activities found
- Missing required data

## Deployment Notes

### Railway Deployment
The feature works on Railway because it:
- Uses pure Node.js/JavaScript (no Windows dependencies)
- Processes files in memory (no file system requirements)
- Uses ExcelJS (cross-platform)

### Environment Variables
No additional environment variables required.

### Dependencies
Ensure these are in package.json:
```json
{
  "multer": "^1.4.5-lts.1",
  "exceljs": "^4.4.0"
}
```

## Testing

### Local Testing
1. Start the server: `npm start`
2. Visit `http://localhost:3000/klein-converter`
3. Upload a test schedule file
4. Verify download and format

### Test Files
Use the example schedule from:
`C:\Users\chrwah28.KVA\OneDrive - Kungl. Vetenskapsakademien\Skrivbordet\Schema_Kleindagarna_januari 2026.xlsx`

## Troubleshooting

### "No valid activities found"
- Check that date headers use "januari" format
- Verify time format matches supported patterns
- Ensure activity rows have required columns

### "Invalid file type"
- Only .xlsx and .xls files accepted
- Check file extension

### Conversion produces empty fields
- Verify column structure matches expected format
- Check for "nan" or empty values in source file

## Future Enhancements

Potential improvements:
- Support for other months (currently hardcoded to januari)
- Support for other years (currently 2026)
- Preview before download
- Validation summary
- Batch processing multiple files

## Contact

For issues or questions about Klein Converter, contact the IML IT department.

---

**Last Updated**: 2026-01-07

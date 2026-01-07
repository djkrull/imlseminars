const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// GET /klein-converter - Show upload page
router.get('/klein-converter', (req, res) => {
  res.render('klein-converter', {
    title: 'Klein Schedule Converter',
    error: null
  });
});

// POST /api/klein-converter/convert - Convert Excel file
router.post('/api/klein-converter/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the uploaded Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({ error: 'Excel file is empty or invalid' });
    }

    // Process the schedule
    const activities = [];
    let currentDate = null;

    worksheet.eachRow((row, rowNumber) => {
      const firstCell = row.getCell(1).value;
      if (!firstCell) return;

      const firstCellStr = String(firstCell).trim();

      // Check if this is a date header (e.g., "Tisdag 13 januari")
      const dateMatch = firstCellStr.match(/(\d+)\s+januari/i);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        currentDate = `2026-01-${day.toString().padStart(2, '0')}`;
        return;
      }

      // Skip header rows
      if (firstCellStr.toLowerCase() === 'tid' || firstCellStr.toLowerCase() === 'nan') {
        return;
      }

      // Check if this row contains a time
      const timePattern = /(\d{1,2})[:.:](\d{2})\s*[-–]\s*(\d{1,2})[:.:](\d{2})|Från\s+(\d{1,2})[:.:](\d{2})|^(\d{1,2})[:.:](\d{2})$/;
      const timeMatch = firstCellStr.match(timePattern);

      if (timeMatch && currentDate) {
        let startTime, endTime;

        if (timeMatch[1]) {
          // Format: "08.00-09.00" or "09:00-09:30"
          const startHour = parseInt(timeMatch[1]);
          const startMin = parseInt(timeMatch[2]);
          const endHour = parseInt(timeMatch[3]);
          const endMin = parseInt(timeMatch[4]);
          startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        } else if (timeMatch[5]) {
          // Format: "Från 15.00"
          const startHour = parseInt(timeMatch[5]);
          const startMin = parseInt(timeMatch[6]);
          const endHour = (startHour + 1) % 24;
          startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          endTime = `${endHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        } else if (timeMatch[7]) {
          // Format: "10.00"
          const startHour = parseInt(timeMatch[7]);
          const startMin = parseInt(timeMatch[8]);
          let endHour = startHour;
          let endMin = startMin + 15;
          if (endMin >= 60) {
            endHour += 1;
            endMin -= 60;
          }
          startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        } else {
          return;
        }

        // Extract title, location, speaker
        const title = row.getCell(2).value ? String(row.getCell(2).value).trim() : '';
        let location = row.getCell(3).value ? String(row.getCell(3).value).trim() : '';
        const speaker = row.getCell(4).value ? String(row.getCell(4).value).trim() : '';
        const abstract = row.getCell(5).value ? String(row.getCell(5).value).trim() : '';

        // Skip empty titles
        if (!title || title.toLowerCase() === 'nan') {
          return;
        }

        // Build description
        let description = '';
        if (speaker && speaker.toLowerCase() !== 'nan') {
          description = speaker;
        }
        if (abstract && abstract.toLowerCase() !== 'nan') {
          description = description ? `${description}\n${abstract}` : abstract;
        }

        // Clean location
        if (location.toLowerCase() === 'nan') {
          location = '';
        }

        activities.push({
          startDate: currentDate,
          startTime,
          endDate: currentDate,
          endTime,
          title,
          description,
          track: '',
          tags: '',
          location,
          groups: ''
        });
      }
    });

    if (activities.length === 0) {
      return res.status(400).json({ error: 'No valid activities found in the schedule' });
    }

    // Create output workbook (Ventla format)
    const outputWorkbook = new ExcelJS.Workbook();
    const outputWorksheet = outputWorkbook.addWorksheet('Sheet1');

    // Add headers
    outputWorksheet.columns = [
      { header: 'Start date', key: 'startDate', width: 15 },
      { header: 'Start time', key: 'startTime', width: 15 },
      { header: 'End date', key: 'endDate', width: 15 },
      { header: 'End time', key: 'endTime', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Track', key: 'track', width: 10 },
      { header: 'Tag(s)', key: 'tags', width: 15 },
      { header: 'Room location', key: 'location', width: 18 },
      { header: 'Group(s)', key: 'groups', width: 34 }
    ];

    // Add activities
    activities.forEach(activity => {
      outputWorksheet.addRow(activity);
    });

    // Format all cells as text
    outputWorksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.numFmt = '@'; // Text format
      });
    });

    // Generate buffer
    const buffer = await outputWorkbook.xlsx.writeBuffer();

    // Send file as download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ProgramImport.xlsx');
    res.send(buffer);

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert file: ' + error.message });
  }
});

module.exports = router;

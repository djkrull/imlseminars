const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { isAuthenticated, login, logout } = require('../middleware/auth');
const Talk = require('../models/Talk');

// GET /admin/login - Show login page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', {
    title: 'Admin Login',
    error: null
  });
});

// POST /admin/login - Handle login
router.post('/login', login);

// GET /admin/logout - Handle logout
router.get('/logout', logout);

// GET /admin or /admin/dashboard - Show dashboard
router.get(['/', '/dashboard'], isAuthenticated, async (req, res) => {
  try {
    const talks = await Talk.findAll();

    res.render('admin-dashboard', {
      title: 'Admin Dashboard',
      talks,
      totalSubmissions: talks.length
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load dashboard',
      statusCode: 500
    });
  }
});

// GET /admin/export - Export to Excel
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const talks = await Talk.findAll();

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Talk Submissions');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Affiliation', key: 'affiliation', width: 40 },
      { header: 'Talk Title', key: 'talkTitle', width: 50 },
      { header: 'Abstract', key: 'talkAbstract', width: 80 },
      { header: 'Questions', key: 'questions', width: 50 },
      { header: 'Send Copy', key: 'sendCopy', width: 15 },
      { header: 'Submitted At', key: 'submittedAt', width: 25 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' } // Gold color matching IML branding
    };

    // Add data rows
    talks.forEach(talk => {
      worksheet.addRow({
        id: talk.id,
        firstName: talk.firstName,
        lastName: talk.lastName,
        email: talk.email,
        affiliation: talk.affiliation,
        talkTitle: talk.talkTitle,
        talkAbstract: talk.talkAbstract,
        questions: talk.questions || '',
        sendCopy: talk.sendCopy ? 'Yes' : 'No',
        submittedAt: talk.getFormattedDate()
      });
    });

    // Enable text wrapping for abstract column
    worksheet.getColumn('talkAbstract').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('questions').alignment = { wrapText: true, vertical: 'top' };

    // Set response headers
    const filename = `IML_Talk_Submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`Excel export generated: ${filename} (${talks.length} submissions)`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/view/:id - View single submission
router.get('/view/:id', isAuthenticated, async (req, res) => {
  try {
    const talk = await Talk.findById(req.params.id);

    if (!talk) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Talk submission not found',
        statusCode: 404
      });
    }

    res.render('admin-view-submission', {
      title: 'View Submission',
      talk
    });
  } catch (error) {
    console.error('Error viewing submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load submission',
      statusCode: 500
    });
  }
});

// DELETE /admin/delete/:id - Delete submission
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const success = await Talk.delete(req.params.id);

    if (success) {
      res.redirect('/admin/dashboard?deleted=true');
    } else {
      res.status(404).render('error', {
        title: 'Not Found',
        message: 'Talk submission not found',
        statusCode: 404
      });
    }
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to delete submission',
      statusCode: 500
    });
  }
});

// GET /admin/scheduling - Show scheduling page
router.get('/scheduling', isAuthenticated, async (req, res) => {
  try {
    res.render('admin-scheduling', {
      title: 'Schedule Management'
    });
  } catch (error) {
    console.error('Error loading scheduling page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load scheduling page',
      statusCode: 500
    });
  }
});

// GET /admin/scheduling/export - Export schedule to Excel
router.get('/scheduling/export', isAuthenticated, async (req, res) => {
  try {
    const db = require('../config/database');
    const scheduledTalks = await db.getAllScheduledTalks();

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schedule');

    // Define columns matching the format from the Excel file
    worksheet.columns = [
      { header: 'Start', key: 'start', width: 20 },
      { header: 'End', key: 'end', width: 20 },
      { header: 'Speaker', key: 'speaker', width: 30 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Affiliation', key: 'affiliation', width: 40 },
      { header: 'Abstract', key: 'abstract', width: 80 },
      { header: 'Room', key: 'room', width: 30 },
      { header: 'Tag', key: 'tag', width: 15 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' } // Gold color matching IML branding
    };

    // Add data rows
    scheduledTalks.forEach(talk => {
      const isEvent = !talk.submission_id;
      const speaker = isEvent
        ? (talk.event_speaker || '')
        : `${talk.first_name} ${talk.last_name}`;
      const title = isEvent ? talk.event_title : talk.talk_title;
      const affiliation = isEvent ? (talk.event_affiliation || '') : talk.affiliation;
      const abstract = isEvent ? (talk.event_abstract || '') : talk.talk_abstract;

      worksheet.addRow({
        start: new Date(talk.start_time).toLocaleString('en-US'),
        end: new Date(talk.end_time).toLocaleString('en-US'),
        speaker: speaker,
        title: title,
        affiliation: affiliation,
        abstract: abstract,
        room: talk.room_name || '',
        tag: talk.publish_to_website ? 'website' : ''
      });
    });

    // Enable text wrapping
    worksheet.getColumn('abstract').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    // Set response headers
    const filename = `IML_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`Schedule export generated: ${filename} (${scheduledTalks.length} talks)`);
  } catch (error) {
    console.error('Error exporting schedule:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate schedule Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/scheduling/export-app - Export schedule for event app
router.get('/scheduling/export-app', isAuthenticated, async (req, res) => {
  try {
    const db = require('../config/database');
    const scheduledTalks = await db.getAllScheduledTalks();

    // Filter only published talks
    const publishedTalks = scheduledTalks.filter(talk => talk.status === 'published');

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Define columns matching the event app format
    worksheet.columns = [
      { header: 'Start date', key: 'start_date', width: 15 },
      { header: 'Start time', key: 'start_time', width: 12 },
      { header: 'End date', key: 'end_date', width: 15 },
      { header: 'End time', key: 'end_time', width: 12 },
      { header: 'Title', key: 'title', width: 60 },
      { header: 'Description', key: 'description', width: 80 },
      { header: 'Track', key: 'track', width: 15 },
      { header: 'Tag(s)', key: 'tags', width: 15 },
      { header: 'Room location', key: 'room', width: 30 },
      { header: 'Group(s)', key: 'groups', width: 15 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    publishedTalks.forEach(talk => {
      const isEvent = !talk.submission_id;
      const speaker = isEvent
        ? (talk.event_speaker || '')
        : `${talk.first_name} ${talk.last_name}`;
      const title = isEvent ? talk.event_title : talk.talk_title;
      const affiliation = isEvent ? (talk.event_affiliation || '') : talk.affiliation;
      const abstract = isEvent ? (talk.event_abstract || '') : talk.talk_abstract;

      const startDate = new Date(talk.start_time);
      const endDate = new Date(talk.end_time);

      // Format Title: "Speaker Name: Talk Title"
      const formattedTitle = speaker ? `${speaker}: ${title}` : title;

      // Format Description with HTML
      let formattedDescription = '';
      if (speaker) {
        formattedDescription = `<b>Speaker</b><br/>${speaker}`;
        if (affiliation) {
          formattedDescription += `, ${affiliation}`;
        }
        formattedDescription += '<br/><br/>';
      }
      if (abstract) {
        formattedDescription += `<b>Abstract</b><br/>${abstract}`;
      }

      worksheet.addRow({
        start_date: startDate,
        start_time: startDate,
        end_date: endDate,
        end_time: endDate,
        title: formattedTitle,
        description: formattedDescription,
        track: '',
        tags: talk.publish_to_website ? 'website' : '',
        room: talk.room_name || '',
        groups: ''
      });
    });

    // Format date/time columns
    worksheet.getColumn('start_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('end_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('start_time').numFmt = 'hh:mm';
    worksheet.getColumn('end_time').numFmt = 'hh:mm';

    // Enable text wrapping
    worksheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    // Set response headers
    const filename = `IML_EventApp_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`Event app export generated: ${filename} (${publishedTalks.length} published talks)`);
  } catch (error) {
    console.error('Error exporting schedule for event app:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate event app Excel file',
      statusCode: 500
    });
  }
});

module.exports = router;

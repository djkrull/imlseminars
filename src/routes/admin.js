const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const ExcelJS = require('exceljs');
const { isAuthenticated, isAdmin, getUserRole, login, logout, requireProgramAccess } = require('../middleware/auth');
const { syncPrograms, syncWorkshops } = require('../services/programSync');
const Talk = require('../models/Talk');
const db = require('../config/database');

// GET /admin/login - Show login page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/programs');
  }
  if (req.session && req.session.isExternal) {
    if (req.session.programId) {
      return res.redirect(`/admin/p/${req.session.programId}/scheduling`);
    }
    return res.redirect('/admin/programs');
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

// GET /admin/programs - Program listing page (admin only)
router.get('/programs', isAdmin, async (req, res) => {
  try {
    const programs = await db.getAllPrograms();
    res.render('admin-programs', { title: 'Programs', programs, role: getUserRole(req) });
  } catch (error) {
    console.error('Error loading programs:', error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load programs' });
  }
});

// POST /admin/programs/sync - Sync programs and workshops from IML Booking App
router.post('/programs/sync', isAdmin, async (req, res) => {
  try {
    const programCount = await syncPrograms();
    const workshopCount = await syncWorkshops();
    res.json({ success: true, programs: programCount, workshops: workshopCount, message: `${programCount} programs and ${workshopCount} workshops synced` });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// GET /admin or /admin/dashboard - Redirect to programs page
router.get(['/', '/dashboard'], isAuthenticated, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin/programs');
  if (req.session.programId) return res.redirect(`/admin/p/${req.session.programId}/scheduling`);
  return res.redirect('/admin/programs');
});

// --- Program-scoped routes ---

// GET /admin/p/:programId/dashboard - Program dashboard
router.get('/p/:programId/dashboard', isAuthenticated, requireProgramAccess, async (req, res) => {
  try {
    const programId = req.params.programId;
    const program = await db.getProgramById(programId);
    if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });

    const talks = await db.getSubmissionsByProgram(programId);
    const talkObjects = talks.map(t => new Talk(t));
    const workshops = await db.getWorkshopsByProgram(programId);
    res.render('admin-dashboard', {
      title: program.name + ' - Dashboard',
      talks: talkObjects,
      totalSubmissions: talkObjects.length,
      program,
      programId,
      workshops
    });
  } catch (error) {
    console.error('Error loading program dashboard:', error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load dashboard' });
  }
});

// GET /admin/p/:programId/scheduling - Program scheduling page
router.get('/p/:programId/scheduling', isAuthenticated, requireProgramAccess, async (req, res) => {
  try {
    const programId = req.params.programId;
    const program = await db.getProgramById(programId);
    if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });

    res.render('admin-scheduling', {
      title: program.name + ' - Schedule',
      role: getUserRole(req),
      program,
      programId
    });
  } catch (error) {
    console.error('Error loading scheduling:', error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load scheduling' });
  }
});

// GET /admin/p/:programId/export - Program-scoped export
router.get('/p/:programId/export', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const programId = req.params.programId;
    const program = await db.getProgramById(programId);
    if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });

    const talks = await db.getSubmissionsByProgram(programId);
    const talkObjects = talks.map(t => new Talk(t));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Talk Submissions');

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

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' }
    };

    talkObjects.forEach(talk => {
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

    worksheet.getColumn('talkAbstract').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('questions').alignment = { wrapText: true, vertical: 'top' };

    const filename = `IML_${program.name}_Submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`Program export generated: ${filename} (${talkObjects.length} submissions)`);
  } catch (error) {
    console.error('Error exporting program submissions:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/p/:programId/view/:id - Program-scoped view submission
router.get('/p/:programId/view/:id', isAuthenticated, requireProgramAccess, async (req, res) => {
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

// POST /admin/p/:programId/delete/:id - Program-scoped delete
router.post('/p/:programId/delete/:id', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const success = await Talk.delete(req.params.id);

    if (success) {
      res.redirect(`/admin/p/${req.params.programId}/dashboard?deleted=true`);
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

// GET /admin/p/:programId/scheduling/export - Program-scoped schedule export
router.get('/p/:programId/scheduling/export', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const programId = req.params.programId;
    const program = await db.getProgramById(programId);
    if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });

    const scheduledTalks = await db.getScheduledTalksByProgram(programId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schedule');

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

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' }
    };

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

    worksheet.getColumn('abstract').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    const filename = `IML_${program.name}_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`Program schedule export generated: ${filename} (${scheduledTalks.length} talks)`);
  } catch (error) {
    console.error('Error exporting program schedule:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate schedule Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/p/:programId/scheduling/export-app - Program-scoped event app export
router.get('/p/:programId/scheduling/export-app', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const programId = req.params.programId;
    const program = await db.getProgramById(programId);
    if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });

    const scheduledTalks = await db.getScheduledTalksByProgram(programId);
    const publishedTalks = scheduledTalks.filter(talk => talk.status === 'published');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

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

    worksheet.getRow(1).font = { bold: true };

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

      const formattedTitle = speaker ? `${speaker}: ${title}` : title;

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

    worksheet.getColumn('start_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('end_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('start_time').numFmt = 'hh:mm';
    worksheet.getColumn('end_time').numFmt = 'hh:mm';

    worksheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    const filename = `IML_${program.name}_EventApp_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`Program event app export generated: ${filename} (${publishedTalks.length} published talks)`);
  } catch (error) {
    console.error('Error exporting program schedule for event app:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate event app Excel file',
      statusCode: 500
    });
  }
});

// --- Workshop-scoped routes ---

// GET /admin/p/:programId/workshops - Workshop listing page
router.get('/p/:programId/workshops', isAuthenticated, requireProgramAccess, async (req, res) => {
  const programId = req.params.programId;
  const program = await db.getProgramById(programId);
  if (!program) return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });
  const workshops = await db.getWorkshopsByProgram(programId);
  res.render('admin-workshops', { title: program.name + ' - Workshops', program, programId, workshops, role: getUserRole(req) });
});

// GET /admin/p/:programId/ws/:workshopId/scheduling - Workshop scheduling page
router.get('/p/:programId/ws/:workshopId/scheduling', isAuthenticated, requireProgramAccess, async (req, res) => {
  const { programId, workshopId } = req.params;
  const program = await db.getProgramById(programId);
  const workshop = await db.getWorkshopById(workshopId);
  if (!program || !workshop) return res.status(404).render('error', { title: 'Not Found', message: 'Workshop not found' });
  res.render('admin-scheduling', {
    title: workshop.name + ' - Schedule',
    role: getUserRole(req),
    program, programId, workshop, workshopId
  });
});

// GET /admin/p/:programId/ws/:workshopId/scheduling/export - Workshop schedule export
router.get('/p/:programId/ws/:workshopId/scheduling/export', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const { programId, workshopId } = req.params;
    const program = await db.getProgramById(programId);
    const workshop = await db.getWorkshopById(workshopId);
    if (!program || !workshop) return res.status(404).render('error', { title: 'Not Found', message: 'Workshop not found' });

    const scheduledTalks = await db.getScheduledTalksByWorkshop(workshopId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schedule');

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

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' }
    };

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

    worksheet.getColumn('abstract').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    const filename = `IML_${workshop.name}_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`Workshop schedule export generated: ${filename} (${scheduledTalks.length} talks)`);
  } catch (error) {
    console.error('Error exporting workshop schedule:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate schedule Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/p/:programId/ws/:workshopId/scheduling/export-app - Workshop event app export
router.get('/p/:programId/ws/:workshopId/scheduling/export-app', isAdmin, requireProgramAccess, async (req, res) => {
  try {
    const { programId, workshopId } = req.params;
    const program = await db.getProgramById(programId);
    const workshop = await db.getWorkshopById(workshopId);
    if (!program || !workshop) return res.status(404).render('error', { title: 'Not Found', message: 'Workshop not found' });

    const scheduledTalks = await db.getScheduledTalksByWorkshop(workshopId);
    const publishedTalks = scheduledTalks.filter(talk => talk.status === 'published');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

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

    worksheet.getRow(1).font = { bold: true };

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

      const formattedTitle = speaker ? `${speaker}: ${title}` : title;

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

    worksheet.getColumn('start_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('end_date').numFmt = 'yyyy-mm-dd';
    worksheet.getColumn('start_time').numFmt = 'hh:mm';
    worksheet.getColumn('end_time').numFmt = 'hh:mm';

    worksheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
    worksheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };

    const filename = `IML_${workshop.name}_EventApp_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`Workshop event app export generated: ${filename} (${publishedTalks.length} published talks)`);
  } catch (error) {
    console.error('Error exporting workshop schedule for event app:', error);
    res.status(500).render('error', {
      title: 'Export Error',
      message: 'Failed to generate event app Excel file',
      statusCode: 500
    });
  }
});

// GET /admin/export - Export to Excel (admin only)
router.get('/export', isAdmin, async (req, res) => {
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

// GET /admin/view/:id - View single submission (admin only)
router.get('/view/:id', isAdmin, async (req, res) => {
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

// DELETE /admin/delete/:id - Delete submission (admin only)
router.post('/delete/:id', isAdmin, async (req, res) => {
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

// GET /admin/scheduling - Show scheduling page (admin + external)
router.get('/scheduling', isAuthenticated, async (req, res) => {
  try {
    res.render('admin-scheduling', {
      title: 'Schedule Management',
      role: getUserRole(req)
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

// GET /admin/scheduling/export - Export schedule to Excel (admin only)
router.get('/scheduling/export', isAdmin, async (req, res) => {
  try {
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

// GET /admin/scheduling/export-app - Export schedule for event app (admin only)
router.get('/scheduling/export-app', isAdmin, async (req, res) => {
  try {
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

// --- Magic Link Management (admin only) ---

// GET /admin/magic-links - Get all magic links (optionally filtered by program_id and/or workshop_id)
router.get('/magic-links', isAdmin, async (req, res) => {
  try {
    const links = await db.getAllMagicLinks(req.query.program_id, req.query.workshop_id);
    res.json(links);
  } catch (error) {
    console.error('Error fetching magic links:', error);
    res.status(500).json({ error: 'Failed to fetch magic links' });
  }
});

// POST /admin/magic-links - Create a new magic link
router.post('/magic-links', isAdmin, async (req, res) => {
  try {
    const { label, expires_at, program_id, workshop_id } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const link = await db.createMagicLink(token, label, expires_at || null, program_id || null, workshop_id || null);
    res.status(201).json(link);
  } catch (error) {
    console.error('Error creating magic link:', error);
    res.status(500).json({ error: 'Failed to create magic link' });
  }
});

// POST /admin/magic-links/:id/deactivate - Deactivate a magic link
router.post('/magic-links/:id/deactivate', isAdmin, async (req, res) => {
  try {
    const success = await db.deactivateMagicLink(req.params.id);
    if (success) {
      res.json({ message: 'Magic link deactivated' });
    } else {
      res.status(404).json({ error: 'Magic link not found' });
    }
  } catch (error) {
    console.error('Error deactivating magic link:', error);
    res.status(500).json({ error: 'Failed to deactivate magic link' });
  }
});

module.exports = router;

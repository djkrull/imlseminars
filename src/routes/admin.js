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

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Talk = require('../models/Talk');
const db = require('../config/database');

// Validation rules
const talkValidationRules = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 255 })
    .withMessage('First name is too long'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 255 })
    .withMessage('Last name is too long'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('sendCopy')
    .optional()
    .custom((value) => {
      return value === 'on' || value === true || value === 'true' || value === false || value === 'false' || value === undefined;
    })
    .withMessage('Invalid checkbox value'),

  body('talkTitle')
    .trim()
    .notEmpty()
    .withMessage('Talk title is required')
    .isLength({ max: 500 })
    .withMessage('Talk title is too long'),

  body('talkAbstract')
    .trim()
    .notEmpty()
    .withMessage('Talk abstract is required')
    .isLength({ min: 50 })
    .withMessage('Abstract must be at least 50 characters long'),

  body('affiliation')
    .trim()
    .notEmpty()
    .withMessage('Affiliation is required')
    .isLength({ max: 500 })
    .withMessage('Affiliation is too long'),

  body('questions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Questions text is too long')
];

// GET / - Show program listing (or fallback to registration form)
router.get('/', async (req, res) => {
  try {
    const programs = await db.getActivePrograms();
    res.render('program-listing', { title: 'Research Programs - Institut Mittag-Leffler', programs });
  } catch (error) {
    console.error('Error loading programs:', error);
    // Fallback to old registration form if programs fail
    res.render('registration', { title: 'Research Talk Submission', errors: [], formData: {} });
  }
});

// POST /api/submit - Handle form submission
router.post('/api/submit', talkValidationRules, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('registration', {
        title: 'Research Talk Submission',
        errors: errors.array(),
        formData: req.body
      });
    }

    // Create new talk submission
    const talkData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      sendCopy: req.body.sendCopy === 'on' || req.body.sendCopy === true,
      talkTitle: req.body.talkTitle,
      talkAbstract: req.body.talkAbstract,
      affiliation: req.body.affiliation,
      questions: req.body.questions || null
    };

    const talk = await Talk.create(talkData);

    console.log('New talk submission received:', {
      id: talk.id,
      name: talk.getFullName(),
      email: talk.email,
      title: talk.talkTitle
    });

    // Redirect to success page
    res.redirect(`/success?id=${talk.id}`);
  } catch (error) {
    console.error('Error submitting talk:', error);
    res.render('registration', {
      title: 'Research Talk Submission',
      errors: [{ msg: 'An error occurred while submitting your talk. Please try again.' }],
      formData: req.body
    });
  }
});

// GET /success - Show success page (backward compatible)
router.get('/success', (req, res) => {
  const submissionId = req.query.id;
  res.render('success', {
    title: 'Submission Successful',
    submissionId
  });
});

// Program-scoped registration form
router.get('/p/:programId/register', async (req, res) => {
  try {
    const program = await db.getProgramById(req.params.programId);
    if (!program) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });
    }
    // Check program is active or planned
    if (program.status !== 'ACTIVE' && program.status !== 'PLANNED') {
      return res.status(400).render('error', { title: 'Registration Closed', message: 'Registration for this program is no longer available.' });
    }
    res.render('registration', {
      title: `Talk Submission - ${program.name}`,
      errors: [],
      formData: {},
      program,
      programId: req.params.programId
    });
  } catch (error) {
    console.error('Error loading registration:', error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load registration form' });
  }
});

// Program-scoped submission
router.post('/p/:programId/register', talkValidationRules, async (req, res) => {
  try {
    const program = await db.getProgramById(req.params.programId);
    if (!program) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Program not found' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('registration', {
        title: `Talk Submission - ${program.name}`,
        errors: errors.array(),
        formData: req.body,
        program,
        programId: req.params.programId
      });
    }

    // Create new talk submission with program scope
    const talkData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      sendCopy: req.body.sendCopy === 'on' || req.body.sendCopy === true,
      talkTitle: req.body.talkTitle,
      talkAbstract: req.body.talkAbstract,
      affiliation: req.body.affiliation,
      questions: req.body.questions || null,
      programId: req.params.programId
    };

    const talk = await Talk.create(talkData);

    console.log('New talk submission received:', {
      id: talk.id,
      name: talk.getFullName(),
      email: talk.email,
      title: talk.talkTitle,
      programId: req.params.programId
    });

    // Redirect to program-scoped success page
    res.redirect(`/p/${req.params.programId}/success?id=${talk.id}`);
  } catch (error) {
    console.error('Error submitting talk:', error);
    let program = null;
    try { program = await db.getProgramById(req.params.programId); } catch (e) { /* ignore */ }
    res.render('registration', {
      title: program ? `Talk Submission - ${program.name}` : 'Research Talk Submission',
      errors: [{ msg: 'An error occurred while submitting your talk. Please try again.' }],
      formData: req.body,
      program,
      programId: req.params.programId
    });
  }
});

// Program-scoped success page
router.get('/p/:programId/success', async (req, res) => {
  const program = await db.getProgramById(req.params.programId);
  res.render('success', {
    title: 'Submission Received',
    submissionId: req.query.id,
    program,
    programId: req.params.programId
  });
});

module.exports = router;

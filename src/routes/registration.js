const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Talk = require('../models/Talk');

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
    .isBoolean()
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

// GET / - Show registration form
router.get('/', (req, res) => {
  res.render('registration', {
    title: 'Research Talk Submission',
    errors: null,
    formData: {}
  });
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

// GET /success - Show success page
router.get('/success', (req, res) => {
  const submissionId = req.query.id;
  res.render('success', {
    title: 'Submission Successful',
    submissionId
  });
});

module.exports = router;

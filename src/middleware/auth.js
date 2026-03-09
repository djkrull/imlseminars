const bcrypt = require('bcrypt');
const db = require('../config/database');

// Check if user is authenticated (admin or external)
function isAuthenticated(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.isExternal)) {
    return next();
  }
  res.redirect('/admin/login');
}

// Check if user is admin only
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.session && req.session.isExternal) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.redirect('/admin/login');
}

// Get current user role from session
function getUserRole(req) {
  if (req.session && req.session.isAdmin) return 'admin';
  if (req.session && req.session.isExternal) return 'external';
  return null;
}

// Check if user has access to a specific program
function requireProgramAccess(req, res, next) {
  const programId = req.params.programId;

  if (!programId) {
    return res.status(400).json({ error: 'Program ID required' });
  }

  // Admin: always allowed
  if (req.session && req.session.isAdmin) {
    req.programId = programId;
    return next();
  }

  // External user: must match their session's program
  if (req.session && req.session.isExternal) {
    if (req.session.programId === programId) {
      req.programId = programId;
      return next();
    }
    if (req.accepts('html')) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'You do not have access to this program.' });
    }
    return res.status(403).json({ error: 'Access denied to this program' });
  }

  // Not authenticated
  return res.redirect('/admin/login');
}

// Verify admin password
async function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD not set in environment variables');
  }

  // For development, allow plain text comparison
  // In production, you should hash the password
  return password === adminPassword;
}

// Login route handler
async function login(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.render('admin-login', {
        title: 'Admin Login',
        error: 'Password is required'
      });
    }

    const isValid = await verifyAdminPassword(password);

    if (isValid) {
      req.session.isAdmin = true;
      req.session.isExternal = false;
      req.session.role = 'admin';
      res.redirect('/admin/dashboard');
    } else {
      res.render('admin-login', {
        title: 'Admin Login',
        error: 'Invalid password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin-login', {
      title: 'Admin Login',
      error: 'An error occurred during login'
    });
  }
}

// Magic link login handler
async function magicLinkLogin(req, res) {
  try {
    const { token } = req.params;
    const link = await db.validateMagicLink(token);

    if (!link) {
      return res.status(403).render('error', {
        title: 'Invalid Link',
        message: 'This scheduling link is invalid or has expired.',
        statusCode: 403
      });
    }

    req.session.isAdmin = false;
    req.session.isExternal = true;
    req.session.role = 'external';
    req.session.magicLinkId = link.id;
    req.session.programId = link.program_id;

    if (link.program_id) {
      res.redirect(`/admin/p/${link.program_id}/scheduling`);
    } else {
      res.redirect('/admin/programs');
    }
  } catch (error) {
    console.error('Magic link login error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred',
      statusCode: 500
    });
  }
}

// Logout route handler
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
}

module.exports = {
  isAuthenticated,
  isAdmin,
  getUserRole,
  requireProgramAccess,
  verifyAdminPassword,
  login,
  magicLinkLogin,
  logout
};

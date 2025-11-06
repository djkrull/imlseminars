const bcrypt = require('bcrypt');

// Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
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
  verifyAdminPassword,
  login,
  logout
};

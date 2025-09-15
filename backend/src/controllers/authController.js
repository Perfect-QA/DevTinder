// Import from smaller auth modules
const { signup } = require('./auth/signupController');
const { login } = require('./auth/loginController');
const { logout, oauthLogout } = require('./auth/logoutController');
const { getDashboard, getUserInfo, refreshToken } = require('./auth/dashboardController');

// Re-export all auth functions
module.exports = {
  signup,
  login,
  logout,
  oauthLogout,
  getDashboard,
  getUserInfo,
  refreshToken
};
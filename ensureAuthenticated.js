// Custom middleware
module.exports = function(req, res, next) {
  if (req.isAuthenticated() && req.session.isInnovoteAuthenticated ) { return next(); }
  res.redirect('/auth/google');
}

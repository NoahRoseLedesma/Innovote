// Custom middleware
const genericResponses = require("../genericResponses.js");

module.exports = function(req, res, next) {
  if (req.session.isTeacher) { return next(); }
  genericResponses.forbidden(res);
}

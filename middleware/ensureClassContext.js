const genericResponses = require("../genericResponses.js");

module.exports = function(req, res, next){
  if(req.session.classContext != undefined) { return next(); }
  genericResponses.requiresClassContext(res);
}

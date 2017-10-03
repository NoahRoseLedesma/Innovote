module.exports = {
  internalError: function(res)
  {
    res.status(500).json({"message":"An internal error occured."}).end();
  },

  forbidden: function(res)
  {
    res.status(401).json({"message":"You are not authorized to view this content or feature."}).end();
  },

  BadRequest: function(res)
  {
    res.status(400).json({"message":"The request could not be completed due to an invalid input."}).end();
  }
}

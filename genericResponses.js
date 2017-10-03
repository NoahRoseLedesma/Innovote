module.exports = {
  internalError: function(res)
  {
    res.status(500).json({"message":"An internal error occured."}).end();
  },

  forbidden: function(res)
  {
    res.status(401).json({"message":"You are not authorized to view this content or feature."}).end();
  }
}

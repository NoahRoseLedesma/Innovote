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
  },

  requiresClassContext: function(res)
  {
    res.status(400).json({"message":"Class context is required for this action."}).end();
  },

  failedDependency: function(res)
  {
    res.status(424).json({"message":"The request has failed due to the failiure of a previous request."}).end();
  },

  created: function(res)
  {
    res.status(201).json({"message":"The resource has been created sucsessfully."}).end();
  },

  notFound: function(res)
  {
    res.status(404).json({"message":"The specified resource could not be found."}).end();
  },

  updated: function(res)
  {
    res.status(200).json({"message":"The specified resource has been updated."}).end();
  },

  deleted: function(res)
  {
    res.status(202).json({"message":"The resource will be deleted."}).end();
  }
}

var router = require("express").Router();
const dbHandler = require("../db.js")
const genericRepsponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../ensureAuthenticated.js');

var db = undefined;

router.get("/list", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res) {
  HaveDatabaseInstance();

  db.collection("classes").find({}, { '_id' : false }).toArray(function(err, result){
    if(err){
      console.error(err.stack)
      genericRepsponses.internalError(res);
    } else {
      res.json(result).end();
    }
  });
});

router.get("/find/:class_name", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res){
  HaveDatabaseInstance();

  db.collection("classes").find({ "name" : req.params.class_name }, { '_id' : false }).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericRepsponses.internalError(res);
    } else {
      res.json(result);
    }
  });
});

// Ensures we have a DB instance.
function HaveDatabaseInstance()
{
  if( db == undefined )
    db = dbHandler.getDatabaseInstance();
}

module.exports = router;

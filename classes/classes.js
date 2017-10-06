var router = require("express").Router();
const dbHandler = require("../db.js")
const genericRepsponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');

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

router.get("/context/:class_name", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res){
  HaveDatabaseInstance();

  db.collection("classes").find({ "name" : req.params.class_name }, { "_id" : false }).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericRepsponses.internalError(res);
    } else {
      if( result.length != 1 )
      {
        genericRepsponses.BadRequest(res);
      } else {
        req.session.classContext = result[0];
        res.json({"message" : "Class context set sucsessfully."});
      }
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

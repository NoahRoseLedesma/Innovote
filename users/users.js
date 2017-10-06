var router = require("express").Router();
const dbHandler = require("../db.js")
const genericRepsponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');

var db = undefined;

router.get("/", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res){
  HaveDatabaseInstance();

  db.collection("users").find({}, { '_id' : false, 'secret_name' : false } ).toArray(function(err, result)
  {
    if(err){
      console.error(err.stack)
      genericRepsponses.internalError(res);
    } else {
      res.json( result ).end();
    }
  });
});

router.get("/:email", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res){
  HaveDatabaseInstance();

  if( req.params.email.toLowerCase() == "me")
  {
    req.params.email = req.user.email;
  }

  db.collection("users").find({"email" : req.params.email }, { '_id' : false } ).toArray(function(err, result)
  {
    if(err){
      console.error(err.stack)
      genericRepsponses.internalError(res);
    } else {
      res.json( result ).end();
    }
  });
});

router.get("/class/:class_name", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res){
  HaveDatabaseInstance();

  db.collection("classes").find({ "name" : req.params.class_name }, { '_id' : false }).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericRepsponses.internalError(res);
    } else {
      console.log(result);
      db.collection("users").find({ "class" : result.name }, { '_id' : false }).toArray(function(err, result){
        if(err) {
          console.error(err.stack);
          genericRepsponses.internalError(res);
        }
        else {
          res.json(result);
        }
      });
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

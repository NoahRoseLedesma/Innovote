var router = require("express").Router();
const dbHandler = require("../db.js")
const genericResponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');
const isTeacher = require('../middleware/isTeacher.js');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const objectID = require('mongodb').ObjectID;

var db = undefined;

router.use(fileUpload());

router.get("/current", dbHandler.ensureDatabaseConnection, ensureAuthenticated, function(req, res) {
  HaveDatabaseInstance();

  if(req.session.classContext == undefined)
  {
    genericResponses.requiresClassContext(res);
    return;
  }

  const currentTime = Date.now();
  db.collection("prompts").find({ "class" : req.session.classContext.name, "start" : { "$lt" : currentTime }, "end" : { "$gt" : currentTime } }, { "_id" : false }).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericResponses.internalError(res);
    } else {
      if( result.length == 0)
      {
        res.send(result).end();
      } else {
        fs.readFile("./prompts/content/" + result[0].file, function(err, data){
          if(err) {
            console.error(err.stack);
            genericResponses.internalError(res);
          } else {
            // Sort of a hack, but we replace the "file" entry in our object with the content of the file
            result[0].file = data;
            res.json(result[0]);
          }
        });
      }
    }
  });
});

// This should be POST or PUT.
router.get("/:fileName/:startTime/:endTime", dbHandler.ensureDatabaseConnection, ensureAuthenticated, isTeacher, function(req, res){
  HaveDatabaseInstance();

  if( req.session.classContext == undefined ) {
    genericResponses.requiresClassContext(res);
    return;
  }

  var input = req.params;
  if(!input || !input.fileName || !input.startTime || !input.endTime )
  {
    genericResponses.BadRequest(res);
  } else {
    fs.stat(__dirname + "/content/" + input.fileName, function(err, stat){
      if( !err ) {
        // This means the file exists.
        input.startTime = parseInt(input.startTime);
        input.endTime = parseInt(input.endTime);

        if ( input.startTime == NaN || input.endTime == NaN  || input.startTime > input.endTime )
        {
          genericResponses.BadRequest(res);
        } else {
          // Check for conflicts, file or start / end time for that class.
          db.collection("prompts").find({ "$or" : [
            { "file" : input.fileName },
            {
              "class" : req.session.classContext.name,
              // See https://stackoverflow.com/questions/26876803/mongodb-find-date-range-if-overlap-with-other-dates
              // for explination on time overlaps.
              "start" : {"$lt": input.endTime},
              "end"   : {"$gt": input.startTime}
            }]}).toArray(function(err, result){
              if(err) {
                console.error(err.stack);
                genericResponses.internalError(res);
              } else {
                if(result.length != 0)
                {
                  genericResponses.BadRequest(res);
                } else {
                  db.collection("prompts").insert({ "file" : input.fileName, "start" : input.startTime, "end" : input.endTime, "class" : req.session.classContext.name }, function(err, result){
                    if(err) {
                      console.error(err.stack);
                      genericResponses.internalError(res);
                    } else {
                      genericResponses.created(res);
                    }
                  });
                }
              }
          });
        }
      } else if( err.code == 'ENOENT' ) { // File does not exist.
        genericResponses.failedDependency(res);
      } else {
        console.error(err.stack)
        genericResponses.internalError(res);
      }
    });
  }
});

router.post("/upload", dbHandler.ensureDatabaseConnection, ensureAuthenticated, isTeacher, function(req, res){
  if(!req.files.prompt) {
    genericResponses.BadRequest(res);
  } else {
    if(req.files.prompt.mimetype != "text/html") {
      genericResponses.BadRequest(res);
    } else {
      const newFileName = new objectID() + ".html";
      req.files.prompt.mv(__dirname + "/content/" + newFileName, function(err){
        if(err) {
          console.error(err.stack);
          genericResponses.internalError(res);
        } else {
          res.status(201).json({ "message":"The resource has been created sucsessfully", "file" : newFileName }).end();
        }
      });
    }
  }
});

// Ensures we have a DB instance.
function HaveDatabaseInstance() {
  if( db == undefined )
    db = dbHandler.getDatabaseInstance();
}

module.exports = router;

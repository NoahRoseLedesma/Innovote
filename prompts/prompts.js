var router = require("express").Router();
const dbHandler = require("../db.js")
const genericResponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');
const ensureClassContext = require("../middleware/ensureClassContext.js");
const isTeacher = require('../middleware/isTeacher.js');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const objectID = require('mongodb').ObjectID;

var db = undefined;

router.use(fileUpload());

// Gets the current prompt.
// Define this as a child of router so that it will be exported in module.exports
// Returns undefined through callback if there is no current prompt
// Useage requires route has ensureDatabaseConnection, ensureAuthenticated, and ensureClassContext
router.getCurrentPrompt = function(req, next){
  HaveDatabaseInstance();

  const currentTime = Date.now();
  db.collection("prompts").find({ "class" : req.session.classContext.name, "start" : { "$lt" : currentTime }, "endVoting" : { "$gt" : currentTime } }, { "_id" : false }).toArray(function(err, result){
    if(err) {
      next(err, undefined);
    } else {
      if( result.length == 0)
      {
        next(undefined, undefined);
      } else {
        next(undefined, result)
      }
    }
  });
}

router.get("/current", dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, function(req, res){
  router.getCurrentPrompt(req, function(err, result){
    if(err) {
      console.error(err.stack);
      genericResponses.internalError(res);
    } else {
      fs.readFile("./prompts/content/" + result[0].file, function(err, data){
        if(err) {
          next(err, undefined);
        } else {
          // Sort of a hack, but we replace the "file" entry in our object with the content of the file
          result[0].file = data;
          res.json(result).end();
        }
      });
    }
  });
});

router.post("/:fileName/:startTime/:endSubmissionTime/:endVotingTime", dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, isTeacher, function(req, res){
  HaveDatabaseInstance();

  var input = req.params;
  if(!input || !input.fileName || !input.startTime || !input.endSubmissionTime || !input.endVotingTime )
  {
    genericResponses.BadRequest(res);
  } else {
    fs.stat(__dirname + "/content/" + input.fileName, function(err, stat){
      if( !err ) {
        // This means the file exists.
        input.startTime = parseInt(input.startTime);
        input.endSubmissionTime = parseInt(input.endSubmissionTime);
        input.endVotingTime = parseInt(input.endVotingTime);

        if ( input.startTime == NaN || input.endSubmissionTime == NaN  || input.endVotingTime == NaN || !areNumbersAcendingInOrder(input.startTime, input.endSubmissionTime, input.endVotingTime))
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
              "start" : {"$lt": input.endVotingTime},
              "endVoting"   : {"$gt": input.startTime}
            }]}).toArray(function(err, result){
              if(err) {
                console.error(err.stack);
                genericResponses.internalError(res);
              } else {
                if(result.length != 0)
                {
                  genericResponses.BadRequest(res);
                } else {
                  db.collection("prompts").insert({
                     "file" : input.fileName,
                     "start" : input.startTime,
                     "endSubmissionTime" : input.endSubmissionTime,
                     "endVotingTime" : input.endVotingTime,
                     "class" : req.session.classContext.name
                   }, function(err, result){
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

router.patch("/:fileName/:startTime/:endSubmissionTime/:endVotingTime", dbHandler.ensureDatabaseConnection, ensureAuthenticated, isTeacher, function(req, res){
  HaveDatabaseInstance();
  var input = req.params;

  input.startTime = parseInt(input.startTime);
  input.endSubmissionTime = parseInt(input.endSubmissionTime);
  input.endVotingTime = parseInt(input.endVotingTime);

  if ( input.startTime == NaN || input.endTime == NaN  || input.endVotingTime == NaN || !areNumbersAcendingInOrder(input.startTime, input.endSubmissionTime, input.endVotingTime) )
  {
    genericResponses.BadRequest(res);
    return
  }

  db.collection("prompts").find({"file" : input.fileName}).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericResponses.internalError(res);
    } else {
      if(result.length == 0) {
        genericResponses.notFound(res);
      } else {
        if(result.length > 1)
        {
          console.error("Multiple prompts exist with name " + input.fileName + "!");
        }
        // Check for conflicts
        db.collection("prompts").find({
          "class" : result[0].class,
          "file"  : {"$ne": input.fileName}, // Dont do a conflict check agianst ourself
          "start" : {"$lt": input.endVoting},
          "endVoting"   : {"$gt": input.startTime}
        }).toArray(function(err, result){
          if(err) {
            console.error(err.stack);
            genericResponses.internalError(err);
          } else {
            if(result.length != 0 ) {
              genericResponses.BadRequest(res);
            } else {
              db.collection("prompts").update({"file":input.fileName},{"$set" : {"start":input.startTime, "endSubmission":input.endSubmissionTime, "endVoting":input.endVotingTime }}, function(err, result){
                if(err) {
                  console.error(err.stack);
                  genericResponses.internalError(res);
                } else {
                  genericResponses.updated(res);
                }
              });
            }
          }
        });
      }
    }
  });
});

router.delete("/:fileName", ensureAuthenticated, isTeacher, function(req, res){
  HaveDatabaseInstance();
  var input = req.params;

  db.collection("prompts").find({"file" : input.fileName}).toArray(function(err, result){
    if(err) {
      console.error(err.stack);
      genericResponses.internalError(res);
    } else {
      if(result.length == 0) {
        genericResponses.notFound(res);
      } else {
        if(result.length > 1)
        {
          console.error("Multiple prompts exist with name " + input.fileName + "!");
        }
        db.collection("prompts").deleteMany({"file" : input.fileName}, function(err, result){
          if(err) {
            console.error(err.stack);
            genericResponses.internalError(res);
          } else {
            genericResponses.deleted(res); // 202 - Sever accepts request and will act on it later.

            // Delete the file
            fs.unlink(__dirname + "/content/" + input.fileName, function(err){
              if(err) {
                // Because we already deleted the database entry for this prompt
                // If deleting the file throws an error we consider it to be an
                // internal only error (eg. not telling client) because in doing
                // so we may desync database with expected.
                console.error(err.stack);
              }
            });
          }
        });
      }
    }
  });
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

// Returns true if the positive numbers are in acending order.
function areNumbersAcendingInOrder() {
  var previousNumber = 0;
  for(var index = 0; index < arguments.length; index++) {
    if( arguments[index] - previousNumber < 0 ) {
      return false;
    }
    previousNumber = arguments[index];
  }
  return true;
}

module.exports = router;

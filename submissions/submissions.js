var router = require("express").Router();
const dbHandler = require("../db.js")
const genericResponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');
const ensureClassContext = require("../middleware/ensureClassContext.js");
const getCurrentPrompt = require('../prompts/prompts.js').getCurrentPrompt;

var db = undefined;

router.post("/submit/:response", dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, function(req, res){
  HaveDatabaseInstance();

  getCurrentPrompt(req, function(err, currentPrompt){
    if(err) {
      console.error(err.stack);
      genericResponses.internalError(res);
    } else {
      if(!currentPrompt || currentPrompt.length == 0) {
        res.status(403).json({"message":"The server is not currently accepting submissions."}).end();
      } else {
        currentPrompt = currentPrompt[0];
        // Check if the user has already voted for this round
        db.collection("submissions").find({"user" : req.user.email, "prompt" : currentPrompt.file}).toArray(function(err, result){
          if(err) {
            console.error(err.stack);
            genericResponses.internalError(res);
          } else {
            if(result.length != 0) {
              res.status(403).json({"message":"You have already submitted for this round."}).end();
            } else {
              db.collection("submissions").insert({
                "user" : req.user.email,
                "prompt" : currentPrompt.file,
                "content" : req.params.response
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
    }
  });


});

router.get("/getall/:prompt", dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, function(req, res){
  HaveDatabaseInstance();

  const currentTime = Date.now();
  // Check if we are in the voting phase.
  db.collection("prompts").find({
     "file" : req.params.prompt,
     "class" : req.session.classContext.name,
     "endSubmission" : { "$lt" : currentTime },
     "endVoting" : { "$gt" : currentTime } }
   ).toArray(function(err, result){
     if(result.length == 0) {
       genericResponses.forbidden(res);
     } else {
       db.collection("submissions").find({ "prompt" : result[0].file }, { "_id" : false }).toArray(function(err, result){
         if(err) {
           console.error(err);
           genericResponses.internalError(res);
         } else {
           if(req.session.isTeacher) {
             res.json(result).end();
           } else {
            // We need to scrub names.
            db.collection("users").find({}).toArray(function(err, users){
              if(err) {
                console.error(err.stack);
                genericResponses.internalError(err);
              } else {
                for( var submittedUsersIndex = 0; submittedUsersIndex < result.length; submittedUsersIndex++) {
                  for( var allUsersIndex = 0; allUsersIndex < users.length; allUsersIndex++ ) {
                    if( result[submittedUsersIndex].user.toLowerCase() == users[allUsersIndex].email.toLowerCase() ) {
                      result[submittedUsersIndex].user = users[allUsersIndex].secret_name;
                    }
                  }
                }
                res.json(result).end();
              }
            });
           }
         }
       });
     }
  });
});

// Ensures we have a DB instance.
function HaveDatabaseInstance() {
  if( db == undefined )
    db = dbHandler.getDatabaseInstance();
}

module.exports = router;

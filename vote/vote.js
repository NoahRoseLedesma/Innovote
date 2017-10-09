var router = require("express").Router();
const dbHandler = require("../db.js")
const genericResponses = require('../genericResponses.js');
const passport = require('passport');
const ensureAuthenticated = require('../middleware/ensureAuthenticated.js');
const ensureClassContext = require("../middleware/ensureClassContext.js");
const getCurrentPrompt = require("../prompts/prompts.js").getCurrentPrompt;
var db = undefined;

router.post('/:secret_name', dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, function(req, res){
  HaveDatabaseInstance();

  // Get current prompt
  getCurrentPrompt(req, function(err, currentPrompt){
    // Check if voting period has started
    const currentTime = Date.now();
    if( !currentPrompt || !( currentPrompt[0].endSubmission < currentTime && currentPrompt[0].endVoting > currentTime) ) {
      res.status(401).json({"message":"There is no active voting period at this time."}).end();
      return;
    }
    // Look up the user
    db.collection("users").find({"secret_name" : req.params.secret_name}).toArray(function(err, targetUser){
      if(err) {
        console.error(err.stack)
        genericResponses.internalError();
      } else {
        if(targetUser.length == 0) {
          genericResponses.BadRequest(res);
        } else {
          // Find that users submission for this round
          db.collection("submissions").find({
            "prompt" : currentPrompt[0].file,
            "user" : targetUser[0].email
          }).toArray(function(err, result) {
            if(err) {
              console.error(err.stack);
              genericResponses.internalError(res);
            } else {
              if(result.length == 0) {
                genericResponses.BadRequest(res);
              } else {
                // Check for previous votes
                db.collection("votes").find({
                  "class" : req.session.classContext.name,
                  "prompt" : currentPrompt[0].file,
                  "user" : req.user.email
                }).toArray(function(err, result){
                  if(result.length > 3) {
                    res.status(401).json({"message":"You have reached the voting limit for this round."}).end();
                  } else {
                    // Check for redundant votes
                    for(var index = 0; index < result.length; index++) {
                      if(result[index].vote.toLowerCase() == targetUser[0].email.toLowerCase()) {
                        res.status(400).json({"message":"You have already voted for " + req.params.secret_name + " this round."});
                        return;
                      }
                    }

                    db.collection("votes").insert({
                      "class" : req.session.classContext.name,
                      "prompt" : currentPrompt[0].file,
                      "user" : req.user.email,
                      "vote" : targetUser[0].email
                    }, function(err){
                      if(err) {
                        console.error(err);
                        genericResponses(res);
                      } else {
                        res.status(200).json({"message":"Vote has been cast sucsessfully."}).end();
                      }
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  });
});

router.get('/standings', dbHandler.ensureDatabaseConnection, ensureAuthenticated, ensureClassContext, function(req, res) {
  HaveDatabaseInstance();

  const currentTime = Date.now();
  getCurrentPrompt(req, function(err, currentPrompt){
    if( !currentPrompt || !( currentPrompt[0].endSubmission < currentTime && currentPrompt[0].endVoting > currentTime) ) {
      res.status(401).json({"message":"There is no active voting period at this time."}).end();
      return;
    }

    // Get all submissions for this prompts
    db.collection("submissions").find({"prompt":currentPrompt[0].file}, {"_id" : false}).toArray(function(err, submissions){
      if(err) {
        console.error(err.stack);
        genericResponses.internalError(err);
      } else {
        if(!submissions || submissions.length == 0) {
          res.json({}).end();
        } else {
          // Tally votes
          db.collection("votes").find({"prompt":currentPrompt[0].file}).toArray(function(err, votes){
            if(err) {
              console.error(err.stack);
              genericResponses.internalError(res);
            } else {
              if(votes.length == 0) {
                res.json({}).end();
              } else {
                db.collection("users").find({}).toArray(function(err, users){
                  if(err) {
                    console.error(err.stack);
                    genericResponses.internalError(res);
                  } else {
                    for(var submissionsIndex = 0; submissionsIndex < submissions.length; submissionsIndex++) {
                      for(var voteIndex = 0; voteIndex < votes.length; voteIndex++) {
                        if( submissions[submissionsIndex].numVotes == undefined ) {
                          submissions[submissionsIndex].numVotes = 0;
                        }
                        if( submissions[submissionsIndex].user.toLowerCase() == votes[voteIndex].vote.toLowerCase() ) {
                          submissions[submissionsIndex].numVotes++;
                        }

                        // Scrub response
                        if(!req.session.isTeacher) {
                          for(var userIndex = 0; userIndex < users.length; userIndex++) {
                            if(users[userIndex].email.toLowerCase() == submissions[submissionsIndex].user.toLowerCase()) {
                              submissions[submissionsIndex].user = users[userIndex].secret_name;
                              break;
                            }
                          }
                        }
                      }
                    }
                    res.json(submissions).end();
                  }
                });
              }
            }
          });
        }
      }
    });
  });
});

// Ensures we have a DB instance.
function HaveDatabaseInstance() {
  if( db == undefined )
    db = dbHandler.getDatabaseInstance();
}

module.exports = router;

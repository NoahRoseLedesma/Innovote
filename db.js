const MongoClient = require('mongodb').MongoClient
const dbConfig = require('./configs/db.json');
const genericResponses = require('./genericResponses.js');

var _db = undefined;

module.exports = {

  connectToServer : function(callback) {
      MongoClient.connect(dbConfig.Mongo.url + dbConfig.Mongo.db, function(err, db) {
      console.log("Connected to MongoDB");
      _db = db;
      callback(err);
    });
  },

  getDatabaseInstance : function() {
    return _db;
  },

  // Middleware
  ensureDatabaseConnection : function(req, res, next) {
    if( _db == undefined )  {
      console.error("Database connection undefined. Starting connection...");

      connectToServer(function(err){
        if(err) {
          console.error("Mongo revival failed!");
        }
      });
    }
    else if ( !_db.serverConfig.isConnected() ) {
      console.error("Database disconnected! Reviving connection...");
      connectToServer(function(err){
        if(err){
          console.error("Mongo revival failed!");
        }
      })
    }
    else {
      return next();
      return;
    }
    genericRepsponses.internalError(res);
  }
}

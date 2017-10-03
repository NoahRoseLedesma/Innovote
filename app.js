const express = require("express");
const passport = require("passport");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require( 'body-parser' );
const RedisStore = require( 'connect-redis' )( session );
const keychain = require( './configs/private.json');
const Database = require('./db.js');
const ensureAuthenticated = require('./ensureAuthenticated.js');

var app = express();

// Databse connection
Database.connectToServer(function(err){
  if(err) throw err;
});

// Passport setup
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
passport.use( new GoogleStrategy(
  {
    clientID:     keychain.google_api.web.client_id,
    clientSecret: keychain.google_api.web.client_secret,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback   : true
  },

  function(request, accessToken, refreshToken, profile, done)
  {
    process.nextTick(function ()
    {
      // TODO: Manage users by something other than profile
      return done(null, profile);
    });
  }
));

// Express setup
app.use( cookieParser());
app.use( bodyParser.json());
app.use( bodyParser.urlencoded({
	extended: true
}));
app.use( session({
	secret: 'fd51cg0yD9',
	name:   'innovoteStore',
	store:  new RedisStore({
		host: '127.0.0.1',
		port: 6379
	}),
	proxy:  true,
    resave: true,
    saveUninitialized: true
}));
app.use( passport.initialize() );
app.use( passport.session() );

// Routing
const auth = require("./auth/google.js");
app.use('/auth', auth);

const classes = require("./classes/classes.js");
app.use('/classes', classes);

const users = require("./users/users.js");
app.use('/users', users);

// Root page
app.get('/', function(req, res) {
  res.send("Welcome to Innovote.");
});

// Start server
app.listen(3000, function() {
  console.log('Application started');
})

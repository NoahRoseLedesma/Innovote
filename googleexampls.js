var google = require('googleapis');
var readline = require('readline');
var OAuth2 = google.auth.OAuth2;
var plus = google.plus('v1');

var oauth2Client = new OAuth2(
  "196120873808-r32jgd5tdv8b4h49e356mja4mrv6ki5p.apps.googleusercontent.com",
  "_kTjZqgdHbC55bNsXPhbNLv-",
  "http://localhost"
);

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/calendar'
];

var url = oauth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'offline',

  // If you only need one scope you can pass it as a string
  scope: scopes,

  // Optional property that passes state parameters to redirect URI
  // state: { foo: 'bar' }
});

function getAccessToken (oauth2Client, callback) {
  // generate consent page url
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // will return a refresh token
    scope: 'https://www.googleapis.com/auth/plus.me' // can be a space-delimited string or an array of scopes
  });

  console.log('Visit the url: ', url);
  rl.question('Enter the code here:', function (code) {
    // request access token
    oauth2Client.getToken(code, function (err, tokens) {
      if (err) {
        return callback(err);
      }
      // set tokens to the client
      // TODO: tokens should be set by OAuth2 client.
      oauth2Client.setCredentials(tokens);
      callback();
    });
  });
}

// retrieve an access token
getAccessToken(oauth2Client, function () {
  // retrieve user profile
  plus.people.get({ userId: 'me', auth: oauth2Client }, function (err, profile) {
    if (err) {
      return console.log('An error occured', err);
    }
    console.log(profile);
  });
});

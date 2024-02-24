# Passport-Contentstack

[Passport](http://passportjs.org/) strategy for authenticating with [Contentstack](https://www.contentstack.com/)
using the OAuth 2.0 API.

This module lets you authenticate using Contentstack in your Node.js applications.
By plugging into Passport, Contentstack authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Installation

```shell
$ npm install @ravencolevol/passport-contentstack
```

## Usage

#### Configure Strategy

The Contentstack authentication strategy authenticates users using a Contentstack account
and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which accepts
these credentials and calls `done` providing a user, as well as `options`
specifying a client ID, client secret, and callback URL.

```javascript
passport.use(new ContentstackStrategy({
    clientID: CONTENTSTACK_CLIENT_ID,
    clientSecret: CONTENTSTACK_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/contentstack/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ email: profile.email }, function (err, user) {
      return done(err, user);
    });
  }
));
```

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'contentstack'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```javascript
app.get('/auth/contentstack',
  passport.authenticate('contentstack'));

app.get('/auth/contentstack/callback', 
  passport.authenticate('contentstack', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
```

## Examples

For a complete, working example, refer to the [login example](https://github.com/RavenColEvol/passport-contentstack/tree/main/examples/).

## Tests

```shell
$ npm install --dev
$ make test
```

## Credits

  - [Jared Hanson](http://github.com/jaredhanson)
  - [Ravi Lamkoti](https://github.com/RavenColEvol)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2011-2013 Jared Hanson <[http://jaredhanson.net/](http://jaredhanson.net/)>


const express = require("express");

//* 1. IMPORT PASSPORT AND REQUIRED PACKAGES FOR SESSION
const session = require("express-session");
const passport = require("passport");
const { ContentstackStrategy } = require("@lamkoti/passport-contentstack");

const app = express();
app.use(express.json());


//* 2. INITIALIZE PASSPORT MIDDLEWARE
app.use(
  session({ secret: "some-secret", resave: false, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

//* 3. INITIALIZE THE CONTENTSTACK STRATEGY
const strategy = new ContentstackStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    authorizationURL:
      "https://app.contentstack.com/apps/<APP_INSTALLATION_UID>/authorize",
    callbackURL: "http://localhost:3000/auth/callback",
    region: "<NA|EU|AZURE_NA|AZURE_EU>",
  },
  (accessToken, refreshToken, profile, next) => {
    // preform user get or creation
    return next(null, profile);
  }
);
passport.use("contentstack", strategy);

app.get("/", ensureIsAuthenticated, (req, res) => {
  const { email } = req.user;
  return res.json({
    email,
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  return res.json({
    msg: "logout was successful",
  });
});

//* 4. REGISTER AUTHENTICATION CALLBACK
app.get(
  "/auth/callback",
  passport.authenticate("contentstack", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.listen(3000);

function ensureIsAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.json({
    msg: "user unauthenticated",
  });
}

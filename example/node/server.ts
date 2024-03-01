import express from 'express';

//* 1. IMPORT PASSPORT AND REQUIRED PACKAGES FOR SESSION
import session from 'express-session';
import passport from 'passport';
import { ContentstackStrategy, Regions } from 'passport-contentstack';

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
    oauthConfig: {
      region: Regions.NA,
      clientID: 'aR01kVCiLGc0enW0',
      clientSecret: 'AYKr8TQGD05Y2JaLlAa0-Brd84A2ehAG',
      appInstallationUID: '65074a21d3f1e80012ec036c',
    },
    callbackURL: '/auth/callback'
  },
  (accessToken, refreshToken, profile, next) => {
    // preform user get or creation
    return next(null, profile);
  }
);
passport.use("contentstack", strategy);

app.get("/", ensureIsAuthenticated, (req, res) => {
  const { email } = req.user as User;
  return res.json({
    email,
  });
});

app.get("/logout", function (req, res) {
  req.logout((err) => {
    console.log('err', err);
  });
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

interface User {
  uid: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  region?: Regions | string;
}
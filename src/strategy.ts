import { Strategy } from "passport";
import OAuth2Strategy, {
  AuthorizationError,
  InternalOAuthError,
  StrategyOptions,
  TokenError,
} from "passport-oauth2";
import { originalURL } from "./utils";
import url from 'url';
import { OAuth2 } from "oauth";
import NullStore from "./state/null";
import { parse } from "./profile";
import { Regions, User, regionAPIBaseURLs, regionBaseURLs } from "./types";

type OptionsToIncludeFromStrategyOptions = 'customHeaders' | 'proxy' | 'passReqToCallback' | 'skipUserProfile';

export type ContentstackOAuthConfig = {
  region: Regions | string;
  clientID: string;
  clientSecret: string;
  appInstallationUID: string;
  apiURL ?: string;
  regionURL ?: string;
};

export interface ContentstackStrategyOptions extends Pick<StrategyOptions, OptionsToIncludeFromStrategyOptions> {
  oauthConfig: ContentstackOAuthConfig | ContentstackOAuthConfig[];
  callbackURL: StrategyOptions['callbackURL']
}

type VerifyCallback = (err?: Error | null, user?:User, info?: object) => void;
type VerifyFunction = ((accessToken: string, refreshToken: string, profile: User, verified: VerifyCallback) => void);
type VerifyFunctionWithReq = ((
  req: any,
  accessToken: string,
  refreshToken: string,
  profile: User,
  verified: VerifyCallback,
) => void);

class ContentstackStrategy extends Strategy {
  _skipUserProfile: StrategyOptions['skipUserProfile'];
  _verify: VerifyFunction | VerifyFunctionWithReq;
  _callbackURL: StrategyOptions['callbackURL'];
  _trustProxy: StrategyOptions['proxy'];
  _regionOAuth2: Record<Regions | string, OAuth2> = {};
  _stateStore: NullStore;
  _passReqToCallback: boolean;
  _regionParams: {
    [key: Regions | string]: {
      profileURL: string;
    }
  } = {}

  constructor(options: ContentstackStrategyOptions, verify: VerifyFunction | VerifyFunctionWithReq) {
    super();

    if (!verify) {
      throw new TypeError('Contentstack OAuth2Strategy requires a verify callback');
    }
    if (!options.oauthConfig) {
      throw new TypeError('Contentstack OAuth2Strategy requires oauthConfig to be passed')
    }

    this.name = "contentstack";
    this._verify = verify;

    const configs = Array.isArray(options.oauthConfig) ? options.oauthConfig : [options.oauthConfig];

    configs.forEach(config => {
      const { region, clientID, clientSecret, appInstallationUID, apiURL, regionURL } = config;

      const api_url = apiURL || regionAPIBaseURLs[region];
      const region_url = regionURL || regionBaseURLs[region];

      if (!api_url) { throw TypeError(`Missing apiURL for ${region} region`); }
      if (!region_url) { throw TypeError(`Missing regionURL for ${region} region`); }

      this._regionParams[region] = { profileURL: `${api_url}/v3/user` };

      const authorizationURL = `${region_url}/apps/${appInstallationUID}/authorize`;
      const tokenURL =  `${region_url}/apps-api/apps/token`;
      const oauth2 = new OAuth2(
        clientID,
        clientSecret,
        '',
        authorizationURL,
        tokenURL,
        options.customHeaders
      );
      this._regionOAuth2[region] = oauth2;
      oauth2.useAuthorizationHeaderforGET(true);
    });

    this._callbackURL = options.callbackURL;
    this._stateStore = new NullStore();

    this._trustProxy = options.proxy;
    this._passReqToCallback = options.passReqToCallback;
    this._skipUserProfile = (options.skipUserProfile === undefined ) ? false : options.skipUserProfile;
  }

  authenticate(req, options) {
    if (req.query?.error) {
      if (req.query.error === "access_denied") {
        return this.fail({ message: req.query.error_description });
      } else {
        return this.error(
          new AuthorizationError(
            req.query.error_description,
            req.query.error,
            req.query.error_uri
          )
        );
      }
    }

    let callbackURL = options.callbackURL || this._callbackURL;
    if (callbackURL) {
      const parsed = url.parse(callbackURL);
      if (!parsed.protocol) {
        callbackURL = url.resolve(originalURL(req, { proxy: this._trustProxy }), callbackURL);
      }
    }

    const region = req.query?.region || req.body?.region;

    const oauth2 = this._regionOAuth2[region];
    if (!oauth2) {
      return this.fail({ message: `Please provide config for ${region}` });
    }

    const code = req.query?.code || req.body?.code;
    if (!code) {
      return this.fail({ message: 'Unable to resolve code from request' });
    }

    const self = this;
    function loaded(err, ok, state) {
      if(err) return self.error(err);
      if (!ok) return self.fail(state, 403);

      const params = self.tokenParams(options);
      params.grant_type = 'authorization_code';

      if (callbackURL) {
        params.redirect_uri = callbackURL;
      }
      oauth2.getOAuthAccessToken(code, params, function (err, accessToken, refreshToken, params) {
        if (err) { return self.error(self._createOAuthError('Failed to obtain access token', err)); }
        if (!accessToken) { return self.error(new Error('Failed to obtain access token')); }

        self._loadUserProfile(region, accessToken, (err, profile) => {
          if (err) { return self.error(err); }

          function verified(err, user, info) {
            if (err) { return self.error(err); }
            if (!user) { return self.fail(info); }

            info = info || {};
            if (state) { info.state = state; }
            self.success(user, info);
          }

          try {
            if (self._passReqToCallback) {
              const verify = self._verify as VerifyFunctionWithReq;
              verify(req, accessToken, refreshToken, profile, verified);
            } else {
              const verify = self._verify as VerifyFunction;
              verify(accessToken, refreshToken, profile, verified);
            }
          } catch (ex) {
            return self.error(ex);
          }
        })
      })
    }

    const state = req.query?.state;
    try {
      this._stateStore.verify(req, state, loaded);
    } catch(ex) {
      return this.error(ex);
    }
  }

  userProfile(region, accessToken, done) {
    if (!this._regionParams[region]) {
      return done(new Error(`The region is not found in Contentstack Passport: ${region}`));
    }
    const oauth2 = this._regionOAuth2[region];
    const { profileURL } = this._regionParams[region];
    return oauth2.get(profileURL, accessToken, (error, body: string, res) => {
      if (error) {
        try {
          const errorJSON = JSON.parse(error.data);
          return done(
            new InternalOAuthError(
              errorJSON.error.message,
              errorJSON.error.code
            )
          );
        } catch (_) {
          return done(
            new InternalOAuthError("Failed to fetch user profile", error)
          );
        }
      }
      let json;
      try {
        json = JSON.parse(body);
      } catch (ex) {
        return done(new Error("Failed to parse user profile"));
      }

      try {
        const profile: any = parse(json);
        
        profile.region = region;
        return done(null, profile);
      } catch (e) {
        return done(e);
      }
    });
  }

  authorizationParams(options) {
    return {};
  }

  tokenParams(options): Record<string, string> {
    return {};
  }

  parseErrorResponse(body, status) {
    const json = JSON.parse(body);
    if (json.error) {
      return new TokenError(json.error_description, json.error, json.error_uri);
    }
    return null;
  }

  _loadUserProfile(region, accessToken, done) {
    const self = this;

    function loadIt() {
      return self.userProfile(region, accessToken, done);
    }
    function skipIt() {
      return done(null);
    }

    if (
      typeof this._skipUserProfile == "function" &&
      this._skipUserProfile.length > 1
    ) {
      // async
      this._skipUserProfile(accessToken, function (err, skip) {
        if (err) {
          return done(err);
        }
        if (!skip) {
          return loadIt();
        }
        return skipIt();
      });
    } else {
      const skip =
        typeof this._skipUserProfile == "function"
          ? this._skipUserProfile()
          : this._skipUserProfile;
      if (!skip) {
        return loadIt();
      }
      return skipIt();
    }
  }

  _createOAuthError(message, err) {
    let e;
    if (err.statusCode && err.data) {
      try {
        e = this.parseErrorResponse(err.data, err.statusCode);
      } catch (_) {}
    }
    if (!e) {
      e = new InternalOAuthError(message, err);
    }
    return e;
  }
}

export default ContentstackStrategy;

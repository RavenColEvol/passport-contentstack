import OAuth2Strategy, { InternalOAuthError } from "passport-oauth2";
import { parse } from "./profile";

enum Regions {
  NA = "NA",
  EU = "EU",
  AZURE_NA = 'AZURE_NA',
  AZURE_EU = 'AZURE_EU'
}

const regionBaseURLs = {
  [Regions.NA]: "https://app.contentstack.com",
  [Regions.EU]: "https://eu-app.contentstack.com",
  [Regions.AZURE_NA]: "https://azure-na-app.contentstack.com",
  [Regions.AZURE_EU]: "https://azure-eu-app.contentstack.com",
};

const regionAPIBaseURLs = {
  [Regions.NA]: "https://api.contentstack.io",
  [Regions.EU]: "https://eu-api.contentstack.com",
  [Regions.AZURE_NA]: "https://azure-na-api.contentstack.com",
  [Regions.AZURE_EU]: "https://azure-eu-api.contentstack.com",
}

export default class ContentstackStrategy extends OAuth2Strategy {
  _profileURL: string;
  _region: string;

  constructor(options, verify) {
    options["region"] = options["region"] || Regions.NA;
    options["tokenURL"] =
      options["tokenURL"] ||
      `${regionBaseURLs[options.region]}/apps-api/apps/token`;

    super(options, verify);

    this._region = options.region;
    this._profileURL = `${regionAPIBaseURLs[options.region]}/v3/user`;
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  userProfile(accessToken, done) {
    this._oauth2.get(this._profileURL, accessToken, (error, body: string, res) => {
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
        
        profile.region = this._region;
        return done(null, profile);
      } catch (e) {
        return done(e);
      }
    });
  }
}

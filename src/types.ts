export enum Regions {
  NA = "NA",
  EU = "EU",
  AZURE_NA = "AZURE_NA",
  AZURE_EU = "AZURE_EU",
  GCP_NA = "GCP_NA",
}

export const regionBaseURLs = {
  [Regions.NA]: "https://app.contentstack.com",
  [Regions.EU]: "https://eu-app.contentstack.com",
  [Regions.AZURE_NA]: "https://azure-na-app.contentstack.com",
  [Regions.AZURE_EU]: "https://azure-eu-app.contentstack.com",
  [Regions.GCP_NA]: "https://gcp-na-app.contentstack.com",
};

export const regionAPIBaseURLs = {
  [Regions.NA]: "https://api.contentstack.io",
  [Regions.EU]: "https://eu-api.contentstack.com",
  [Regions.AZURE_NA]: "https://azure-na-api.contentstack.com",
  [Regions.AZURE_EU]: "https://azure-eu-api.contentstack.com",
  [Regions.GCP_NA]: "https://gcp-na-api.contentstack.com",
};

export interface User {
  uid: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  region?: Regions | string;
}

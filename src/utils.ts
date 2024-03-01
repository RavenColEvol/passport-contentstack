export const originalURL = function (req, options) {
  options = options || {};
  let app = req.app;
  if (app && app.get && app.get("trust proxy")) {
    options.proxy = true;
  }
  let trustProxy = options.proxy;

  let proto = (req.headers["x-forwarded-proto"] || "").toLowerCase(),
    tls =
      req.connection.encrypted ||
      (trustProxy && "https" == proto.split(/\s*,\s*/)[0]),
    host = (trustProxy && req.headers["x-forwarded-host"]) || req.headers.host,
    protocol = tls ? "https" : "http",
    path = req.url || "";
  return protocol + "://" + host + path;
};

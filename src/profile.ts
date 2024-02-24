export function parse(json: { user: Record<string, string> }) {
  const { user } = json;
  var profile = {
    uid: user.uid,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    username: user.username
  };
  
  return profile;
};
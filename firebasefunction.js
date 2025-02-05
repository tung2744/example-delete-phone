const { onRequest } = require("firebase-functions/v2/https");
const {
  configure,
  decodeAccessToken,
  encodeUserIDToNodeID,
  getPhoneNumberIdentity,
  deleteIdentity,
} = require("./lib");
const fs = require("fs");

exports.deletePhoneNumber = onRequest(async (req, res) => {
  // Set required configurations
  configure({
    PROJECT_ID: "YOUR_PROJECT_ID", // Your Authgear project id
    ADMIN_KEY_ID: "YOUR_ADMIN_API_KEY_ID", // Your admin api key id
    // In this example, we read the key from a file.
    // You should consider modifying this part to store the key file securely.
    // See https://docs.authgear.com/reference/apis/admin-api/authentication-and-security
    ADMIN_KEY: fs.readFileSync("key.pem"),
    AUTHGEAR_ENDPOINT: "https://{YOUR_PROJECT}.authgear.cloud",
  });

  if (!req.headers.authorization) {
    throw new Error("unauthorized");
  }

  // Obtain authgear access token from authorization header
  const accessToken = req.headers.authorization.split(" ")[1];

  if (!accessToken) {
    throw new Error("unauthorized");
  }

  const payload = await decodeAccessToken(accessToken);
  const userID = payload.sub;
  const userNodeID = encodeUserIDToNodeID(userID);
  const phoneNumberIdentity = await getPhoneNumberIdentity(userNodeID);
  if (phoneNumberIdentity == null) {
    throw new Error("User has no phone number");
  }
  await deleteIdentity(phoneNumberIdentity.id);
  res.status(200);
});

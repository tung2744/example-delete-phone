// Dependencies
// "jsonwebtoken": "^9.0.2"
// "axios": "^1.7.9
// "jwks-rsa": "^3.1.0"

const node_jwt = require("jsonwebtoken");
const axios = require("axios");
const jwksClient = require("jwks-rsa");

let CONFIGS = {
  PROJECT_ID: "", // Your Authgear project id
  ADMIN_KEY_ID: "", // Your admin api key id
  // In this example, we read the key from a file.
  // You should consider modifying this part to store the key file securely
  // See https://docs.authgear.com/reference/apis/admin-api/authentication-and-security
  ADMIN_KEY: "",
  AUTHGEAR_ENDPOINT: "",
};

function configure(newConfig) {
  CONFIGS = newConfig;
}

// See https://docs.authgear.com/reference/apis/admin-api/authentication-and-security
function makeAdminAPIJWT() {
  const project_id = CONFIGS.PROJECT_ID;
  const key_id = CONFIGS.ADMIN_KEY_ID;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 5; //the current value means token will expire in 5 minutes.

  //Payload to include in JWT
  const claims = {
    aud: project_id,
    iat: Math.floor(Date.now() / 1000),
    exp: expiresAt,
  };

  const privateKey = CONFIGS.ADMIN_KEY;
  const header = { typ: "JWT", kid: key_id, alg: "RS256" };
  const jwt = node_jwt.sign(claims, privateKey, { header: header });

  return jwt;
}

async function makeAdminAPIRequest(gqlRequest) {
  const bearerToken = makeAdminAPIJWT();
  const adminAPIEndpoint = `${CONFIGS.AUTHGEAR_ENDPOINT}/_api/admin/graphql`;

  return fetch(adminAPIEndpoint, {
    method: "POST",
    body: JSON.stringify(gqlRequest),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
  });
}

// identityID is the id of the phone number identity you get from admin api
async function deleteIdentity(identityNodeID) {
  const gqlRequest = {
    operationName: "DeleteIdentity",
    query: `
      mutation DeleteIdentity($nodeID: ID!) {
        deleteIdentity(input: { identityID: $nodeID }) {
          user {
            id
          }
        }
      }
    `,
    variables: {
      nodeID: identityNodeID,
    },
  };

  const response = await makeAdminAPIRequest(gqlRequest);

  const responseJson = await response.json();

  if (responseJson.errors != null) {
    // Some errors occured
    console.error(responseJson.errors);
    throw new Error(responseJson.errors);
  }

  // Success
  console.log(responseJson);
}

async function getPhoneNumberIdentity(userNodeID) {
  const gqlRequest = {
    operationName: "userQuery",
    query: `
      query userQuery($userID: ID!) {
        node(id: $userID) {
          ... on User {
            id
            identities {
              edges {
                node {
                  id
                  type
                  claims
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      }
   `,
    variables: {
      userID: userNodeID,
    },
  };

  const response = await makeAdminAPIRequest(gqlRequest);

  const responseJson = await response.json();

  if (responseJson.errors != null) {
    // Some errors occured
    console.error(responseJson.errors);
    throw new Error(responseJson.errors);
  }

  for (const identityEdge of responseJson.data.node.identities.edges) {
    if (identityEdge.node.type !== "LOGIN_ID") {
      continue;
    }
    if (
      identityEdge.node.claims["https://authgear.com/claims/login_id/type"] !==
      "phone"
    ) {
      continue;
    }
    return identityEdge.node;
  }

  return null;
}

// See https://docs.authgear.com/get-started/backend-api/jwt
async function decodeAccessToken(accessToken) {
  const getJwksUri = async () => {
    const config_endpoint =
      CONFIGS.AUTHGEAR_ENDPOINT + "/.well-known/openid-configuration";
    const data = await axios.get(config_endpoint);
    return data.data.jwks_uri;
  };

  const decoded_access_token = node_jwt.decode(accessToken, { complete: true });
  const jwks_uri = await getJwksUri();
  const client = jwksClient({
    strictSsl: true,
    jwksUri: jwks_uri,
  });
  const signing_key = await client.getSigningKey(
    decoded_access_token.header.kid
  );

  const payload = node_jwt.verify(accessToken, signing_key.publicKey, {
    algorithms: ["RS256"],
  });
  return payload;
}

function encodeUserIDToNodeID(userID) {
  return Buffer.from(`User:${userID}`).toString("base64url");
}

exports.configure = configure;
exports.encodeUserIDToNodeID = encodeUserIDToNodeID;
exports.decodeAccessToken = decodeAccessToken;
exports.deleteIdentity = deleteIdentity;
exports.getPhoneNumberIdentity = getPhoneNumberIdentity;

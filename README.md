# Example code of deleting user's phone number with admin API

- `firebasefunction.js` is an example of a firebase function `deletePhoneNumber`, which do the followings:
  1. Verify the authgear access token in authorization header, and obtain the user id.
  2. Call admin api to obtain the phone number identity of this user.
  3. Call admin api to delete the phone number identity.
  4. Response with a `200` status code if all of the above success. 


- `lib.js` includes the detailed implementation of each function.

- Please note:
  - Please set the required config accordingly. You can take a look at the `CONFIGS` object `lib.js` to know more about it.
    - This example assumes you store the admin api key file in a file named `key.pem`, but it is unlikely to work in firebase function. You could consider storing the key using Secret Manager: https://firebase.google.com/docs/functions/config-env?gen=2nd#secret-manager 
  - The error handling in this example is minimal, please adjust the code according to your requirements.

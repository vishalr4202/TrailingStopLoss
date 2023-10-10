const jwt = require("jsonwebtoken");
const User = require("../model/user");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  console.log(authHeader);
  if (!authHeader) {
    const error = new Error();
    error.statusCode = 401;
    error.data = "Not authenticated, Please Login";
    throw error;
  }
  const token = authHeader;
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, "Fulham@chelsea&Liverpool");
  } catch (error) {
    console.log("inHere");
    error.statusCode = 500;
    throw error;
  }
  console.log(decodedToken);
  if (!decodedToken) {
    const error = new Error("not authenticated");
    error.statusCode = 401;
    error.data = "Incorrect credentials , try again";
    throw error;
  }
  console.log("inHEre find");
  User.findById(decodedToken.userId)
    .then((result) => {
      req.userId = decodedToken.userId;
      req.apiKey = result?.api_key;
      req.secretKey = result?.secret_key;
      req.accessToken = result?.access_token;
      req.request_token = result?.request_token;
      req.email = result?.email;
      req.updatedAt = result.updated_at;
      req.loginId = result.userId;
      next();
    })
    .catch((err) => {
      const error = new Error("api and secret key mismatch");
      error.statusCode = 401;
      error.data = err;
      throw error;
    });
};

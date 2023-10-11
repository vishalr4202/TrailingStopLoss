const express = require("express");
const app = express();

const AuthRoutes = require("./routes/auth");
const MongoConnect = require("./utils/db").MongoConnect;

const port = 80;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(AuthRoutes);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  res.status(status).send(error);
});

MongoConnect(() => {
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
});

const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

let _db;

const MongoConnect = (callback) => {
  // MongoClient.connect("mongodb://localhost:27017/zerodha")
  MongoClient.connect(
    "mongodb+srv://nitin:nitin@cluster0.kbnly1e.mongodb.net/Trial"
  )
    .then((client) => {
      _db = client.db();
      callback();
    })
    .catch((err) => {
      throw err;
    });
};

const getDB = () => {
  if (_db) {
    return _db;
  }
  throw "no DB found";
};

exports.MongoConnect = MongoConnect;
exports.getDB = getDB;

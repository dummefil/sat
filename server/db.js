const {JsonDB} = require("node-json-db");
const {Config} = require("node-json-db/dist/lib/JsonDBConfig");
const db = new JsonDB(new Config("db", true, true, '/'));

module.exports = db;
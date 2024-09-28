const express = require("express");
var app = express();
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
var morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const dbConfig = require("./config/database.config");
const port = process.env.PORT;
// console.log("sss", process.env);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
mongoose.set("strictQuery", false);
var accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});
app.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms :date[web]",
    { stream: accessLogStream }
  )
);

const userRoute = require("./routes/user.router");

app.use("/api", userRoute);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

mongoose.Promise = global.Promise;
mongoose.connect(dbConfig.url, { useNewUrlParser: true });

mongoose.connection.on("error", function (error) {
  console.error("Database connection error:", error);
});

mongoose.connection.once("open", function () {
  console.log("Database connected Taskmanager");
});

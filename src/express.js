const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");
const { initPostgresClient, createTables } = require("./sequelize");
const messageSchedulesRouter = require("./routes/message-schedules-route");

const initializeExpress = (http) => {
  const PORT = process.env.PORT || 3001;
  http.listen(PORT, async () => {
    console.log(`⚡️ Express app is running on port: ${PORT}`);

    await initPostgresClient();
    await createTables();
  });
};

const handleRequests = (app, receiver) => {
  app.use("/", receiver.router);
  app.use("/uploads/images", express.static(path.join("uploads", "images")));

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH");

    next();
  });

  app.use(bodyParser.json());
  app.use(cors());

  app.use("/message-schedules", messageSchedulesRouter);

};

exports.initializeExpress = initializeExpress;
exports.handleRequests = handleRequests;

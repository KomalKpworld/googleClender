const express = require("express");
const { initializeExpress, handleRequests } = require("./express");
require("dotenv").config();
const expressApp = express();
const http = require("http").createServer(expressApp);
initializeExpress(http);
handleRequests(expressApp);
initializeSocket(http);
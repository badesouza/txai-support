"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallImage = exports.Call = exports.User = exports.sequelize = void 0;
const database_1 = require("../config/database");
Object.defineProperty(exports, "sequelize", { enumerable: true, get: function () { return database_1.sequelize; } });
const User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
const Call_1 = require("./Call");
Object.defineProperty(exports, "Call", { enumerable: true, get: function () { return Call_1.Call; } });
const CallImage_1 = require("./CallImage");
Object.defineProperty(exports, "CallImage", { enumerable: true, get: function () { return CallImage_1.CallImage; } });
// Define associations:
User_1.User.hasMany(Call_1.Call, { foreignKey: "userId", as: "calls" });
Call_1.Call.belongsTo(User_1.User, { foreignKey: "userId", as: "requester" });
Call_1.Call.hasMany(CallImage_1.CallImage, { foreignKey: "callId", as: "images" });
CallImage_1.CallImage.belongsTo(Call_1.Call, { foreignKey: "callId" });
// Synchronize (optional if using migrations):
database_1.sequelize.sync({ alter: true });

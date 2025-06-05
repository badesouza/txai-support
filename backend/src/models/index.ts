import { sequelize } from "../config/database";
import { User } from "./User";
import { Call } from "./Call";
import { CallImage } from "./CallImage";

// Define associations:
User.hasMany(Call, { foreignKey: "userId", as: "calls" });
Call.belongsTo(User, { foreignKey: "userId", as: "requester" });

Call.hasMany(CallImage, { foreignKey: "callId", as: "images" });
CallImage.belongsTo(Call, { foreignKey: "callId" });

// Synchronize (optional if using migrations):
sequelize.sync({ alter: true });

export { sequelize, User, Call, CallImage };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Call = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
class Call extends sequelize_1.Model {
}
exports.Call = Call;
Call.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User_1.User,
            key: "id",
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("open", "in_service", "completed", "canceled"),
        defaultValue: "open",
    },
}, {
    tableName: "calls",
    sequelize: database_1.sequelize,
});

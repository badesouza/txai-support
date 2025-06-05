"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallImage = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Call_1 = require("./Call");
class CallImage extends sequelize_1.Model {
}
exports.CallImage = CallImage;
CallImage.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    callId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: Call_1.Call,
            key: "id",
        },
        onDelete: "CASCADE",
    },
    imageUrl: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
}, {
    tableName: "call_images",
    sequelize: database_1.sequelize,
});

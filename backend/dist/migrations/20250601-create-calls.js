"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    await queryInterface.createTable("calls", {
        id: {
            type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        user_id: {
            type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "users", // nome da tabela users
                key: "id", // coluna referenciada
            },
            onDelete: "CASCADE", // comportamento ao deletar usuário
            onUpdate: "CASCADE",
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("open", "in_service", "completed", "canceled"),
            allowNull: false,
            defaultValue: "open",
            comment: "Valores possíveis: open, in_service, completed, canceled",
        },
        createdAt: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
        updatedAt: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    });
}
async function down(queryInterface) {
    await queryInterface.dropTable("calls");
}

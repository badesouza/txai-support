"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const bcrypt_1 = __importDefault(require("bcrypt"));
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(256),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
    profile: {
        type: sequelize_1.DataTypes.ENUM("admin", "technician", "requester"),
        allowNull: false,
        defaultValue: "requester",
    },
}, {
    tableName: "users",
    sequelize: database_1.sequelize,
});
// User Model with business logic
exports.UserModel = {
    async create(userData) {
        const hashedPassword = await bcrypt_1.default.hash(userData.password, 10);
        return User.create({ ...userData, password: hashedPassword });
    },
    async findByEmail(email) {
        return User.findOne({ where: { email } });
    },
    async findById(id) {
        return User.findByPk(id);
    },
    async update(id, userData) {
        const user = await User.findByPk(id);
        if (!user)
            return null;
        if (userData.password) {
            userData.password = await bcrypt_1.default.hash(userData.password, 10);
        }
        return user.update(userData);
    },
    async updatePassword(id, newPassword) {
        const user = await User.findByPk(id);
        if (!user)
            return false;
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await user.update({ password: hashedPassword });
        return true;
    },
    async verifyPassword(user, password) {
        return bcrypt_1.default.compare(password, user.password);
    }
};

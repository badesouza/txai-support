const { DataTypes } = require("sequelize");

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("calls_images", {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            call_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {
                    model: "calls",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            image: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable("calls_images");
    },
}; 
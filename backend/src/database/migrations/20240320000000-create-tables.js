'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Criar tabela de usuários
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            email: {
                type: Sequelize.STRING(128),
                allowNull: false,
                unique: true,
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING(256),
                allowNull: false,
            },
            status: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            profile: {
                type: Sequelize.ENUM('admin', 'technician', 'requester'),
                allowNull: false,
                defaultValue: 'requester',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        // Criar tabela de chamados
        await queryInterface.createTable('calls', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            userId: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: Sequelize.ENUM('open', 'in_service', 'completed', 'canceled'),
                defaultValue: 'open',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('calls');
        await queryInterface.dropTable('users');
    }
}; 
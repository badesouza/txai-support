const { Sequelize } = require('sequelize');
const config = require('../config/database').development;

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        dialect: config.dialect,
        logging: false
    }
);

async function runMigrations() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Create users table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        is_default BOOLEAN DEFAULT false,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);
        console.log('Users table created successfully');

        // Create calls table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        description TEXT NOT NULL,
        userName VARCHAR(255) NOT NULL,
        status ENUM('open', 'in_service', 'completed', 'canceled') DEFAULT 'open',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);
        console.log('Calls table created successfully');

        // Create calls_images table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS calls_images (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        call_id INT UNSIGNED NOT NULL,
        image VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
      )
    `);
        console.log('Calls_images table created successfully');

        process.exit(0);
    } catch (error) {
        console.error('Unable to run migrations:', error);
        process.exit(1);
    }
}

runMigrations(); 
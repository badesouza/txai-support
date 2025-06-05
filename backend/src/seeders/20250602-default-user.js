const bcrypt = require("bcryptjs");

module.exports = {
    up: async (queryInterface) => {
        const hashedPassword = await bcrypt.hash("admin123", 10);

        await queryInterface.bulkInsert("users", [
            {
                name: "Administrador",
                email: "admin@txai.com",
                password: hashedPassword,
                profile: "admin",
                phone: "0000000000",
                is_default: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete("users", {
            email: "admin@txai.com",
        });
    },
}; 
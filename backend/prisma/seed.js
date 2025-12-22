const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@txai.com' },
    update: {},
    create: {
      email: 'admin@txai.com',
      name: 'Admin',
      password: hashedPassword,
      phone: '1234567890',
      profile: 'ADMIN',
    },
  });

  // Keep output simple and stable for scripts
  console.log(`Seed OK: admin user id=${admin.id} email=${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

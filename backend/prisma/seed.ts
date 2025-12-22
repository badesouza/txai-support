// Note: this file is executed via `npx prisma db seed` inside a production container.
// Using CommonJS-style requires here avoids ESM module-resolution issues with ts-node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-var-requires
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

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    // @ts-ignore
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
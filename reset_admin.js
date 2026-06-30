const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin1234', 12);
  const updatedUser = await prisma.user.update({
    where: { loginId: 'ADMIN' },
    data: { passwordHash: hash }
  });
  console.log("Password for ADMIN reset successfully.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

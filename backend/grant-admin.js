const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USERNAME = process.argv[2];
if (!USERNAME) {
  console.error('Usage: node grant-admin.js <username>');
  process.exit(1);
}

prisma.user.update({ where: { username: USERNAME }, data: { isAdmin: true } })
  .then(u => {
    console.log(`✓ ${u.username} is now admin (isAdmin: ${u.isAdmin})`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

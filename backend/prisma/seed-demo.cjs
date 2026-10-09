// Additive AWS demo initialization. Never run against Railway production.
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

async function seedDemo(prisma, credentialsPath, now = new Date()) {
  if (!credentialsPath || !path.isAbsolute(credentialsPath)) {
    throw new Error('Require an absolute private credentials file path');
  }
  let createdCredentialsFile = false;
  try {
    await prisma.$transaction(async (tx) => {
      const users = [];
      const credentials = [];
      for (const [email, name, role] of [
        ['admin@bookingmate.example', 'Demo Court Manager', 'ADMIN'],
        ['customer@bookingmate.example', 'Demo Jordan Taylor', 'CUSTOMER'],
      ]) {
        if (await tx.user.findUnique({ where: { email } })) continue;
        const password = randomBytes(24).toString('base64url');
        const passwordHash = await bcrypt.hash(password, 12);
        users.push({ email, name, role, passwordHash });
        credentials.push({ email, password, role });
      }
      // Persist credentials BEFORE database writes; never overwrite a previous file.
      if (credentials.length) {
        const fd = fs.openSync(credentialsPath, 'wx', 0o600);
        createdCredentialsFile = true;
        try {
          fs.writeFileSync(fd, JSON.stringify(credentials, null, 2));
          fs.fsyncSync(fd);
        } finally {
          fs.closeSync(fd);
        }
      }
      for (const data of users) await tx.user.create({ data });
      for (const [name, durationMinutes, priceCents, capacity] of [
        ['Demo Private Tennis Coaching', 60, 8000, 1],
        ['Demo Small Group Tennis', 90, 4500, 6],
      ]) {
        let service = await tx.service.findFirst({ where: { name } });
        if (!service) service = await tx.service.create({ data: {
          name, durationMinutes, priceCents, isActive: true,
          description: 'Fictional AWS demonstration service.',
        } });
        for (let day = 1; day <= 7; day++) {
          const startAt = new Date(now);
          startAt.setUTCDate(startAt.getUTCDate() + day);
          startAt.setUTCHours(1, 0, 0, 0);
          const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
          await tx.timeSlot.upsert({
            where: { serviceId_startAt: { serviceId: service.id, startAt } },
            update: {},
            create: { serviceId: service.id, startAt, endAt, capacity, status: 'AVAILABLE' },
          });
        }
      }
      const title = 'Demo cancellation policy';
      if (!await tx.businessRule.findFirst({ where: { title } })) {
        await tx.businessRule.create({ data: {
          title, category: 'cancellation', isActive: true,
          content: 'Customers can cancel their own bookings from My Bookings. Cancelled bookings release their reserved place.',
        } });
      }
    }, { timeout: 15000 });
  } catch (error) {
    // Rollback affects every write. Remove only the file this invocation created.
    if (createdCredentialsFile) fs.unlinkSync(credentialsPath);
    throw error;
  }
}

module.exports = { seedDemo };
if (require.main === module) {
  if (process.env.DEMO_SEED_CONFIRM !== 'aws-demo' || !process.env.DATABASE_URL) {
    throw new Error('Require DEMO_SEED_CONFIRM=aws-demo and DATABASE_URL');
  }
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  seedDemo(prisma, process.env.DEMO_CREDENTIALS_FILE)
    .then(() => console.log('Additive demo initialization completed; existing records preserved.'))
    .catch(() => {
      console.error('Demo initialization failed; database writes rolled back. Inspect privately before retrying.');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

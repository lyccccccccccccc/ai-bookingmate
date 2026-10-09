// Additive AWS demo initialization; execute inside the existing backend container.
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
if (process.env.DEMO_SEED_CONFIRM !== 'aws-demo' || !process.env.DEMO_CREDENTIALS_FILE) {
  throw new Error('Require DEMO_SEED_CONFIRM=aws-demo and a private DEMO_CREDENTIALS_FILE');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const credentials = [];
  for (const [email, name, role] of [
    ['admin@bookingmate.example', 'Demo Court Manager', 'ADMIN'],
    ['customer@bookingmate.example', 'Demo Jordan Taylor', 'CUSTOMER'],
  ]) {
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name, role, passwordHash } });
    credentials.push({ email, password, role });
  }
  // Never overwrite a credential file on rerun.
  if (credentials.length) fs.writeFileSync(process.env.DEMO_CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: 'wx' });
  for (const [name, durationMinutes, priceCents, capacity] of [
    ['Demo Private Tennis Coaching', 60, 8000, 1],
    ['Demo Small Group Tennis', 90, 4500, 6],
  ]) {
    let service = await prisma.service.findFirst({ where: { name } });
    if (!service) service = await prisma.service.create({ data: { name, durationMinutes, priceCents, isActive: true, description: 'Fictional AWS demonstration service.' } });
    for (let day = 1; day <= 7; day++) {
      // Explicit UTC instants; browser converts to the user's local timezone.
      const startAt = new Date(); startAt.setUTCDate(startAt.getUTCDate() + day); startAt.setUTCHours(1, 0, 0, 0);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
      await prisma.timeSlot.upsert({ where: { serviceId_startAt: { serviceId: service.id, startAt } }, update: {}, create: { serviceId: service.id, startAt, endAt, capacity, status: 'AVAILABLE' } });
    }
  }
  const title = 'Demo cancellation policy';
  if (!await prisma.businessRule.findFirst({ where: { title } })) await prisma.businessRule.create({ data: { title, category: 'cancellation', content: 'Customers can cancel their own bookings from My Bookings. Cancelled bookings release their reserved place.', isActive: true } });
  console.log('Additive demo initialization completed. Credentials saved privately; existing records preserved.');
}
main().catch(() => { console.error('Demo initialization failed; inspect privately before retrying.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());

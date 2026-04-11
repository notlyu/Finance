// Deprecated: seed script replaced by Prisma-based seeder (prisma-seed.js)
try {
  require('./prisma-seed.js');
} catch (e) {
  console.error('Prisma seed not runnable in this environment:', e?.message ?? e);
  process.exit(1);
}
console.log('Seed script finished. Use prisma-seed.js for Prisma seeding.');

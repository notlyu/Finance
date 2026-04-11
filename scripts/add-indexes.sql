const prisma = require('../lib/prisma');

async function addIndexes() {
  
  try {
    console.log('Adding indexes to Transaction table...');
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_transaction_user_type_date ON "Transaction"(user_id, type, date)`;
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_transaction_family_type_date ON "Transaction"(family_id, type, date)`;
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_transaction_user_family ON "Transaction"(user_id, family_id)`;
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_transaction_category_type ON "Transaction"(category_id, type)`;
    
    console.log('Adding indexes to Goal table...');
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_goal_user_archived ON "Goal"(user_id, is_archived)`;
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_goal_family_archived ON "Goal"(family_id, is_archived)`;
    
    console.log('Adding indexes to Wish table...');
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_wish_user_archived ON "Wish"(user_id, archived)`;
    await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_wish_family_archived ON "Wish"(family_id, archived)`;
    
    console.log('All indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addIndexes();
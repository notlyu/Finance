const prisma = require('../lib/prisma-client');

async function main() {
  console.log('Filling scope for Transaction...');
  const tx1 = await prisma.$executeRaw`UPDATE "Transaction" SET scope = 'personal' WHERE scope IS NULL AND (is_private = true OR family_id IS NULL)`;
  console.log(`Updated ${tx1} transactions to personal`);
  
  const tx2 = await prisma.$executeRaw`UPDATE "Transaction" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL AND is_private = false`;
  console.log(`Updated ${tx2} transactions to family`);

  console.log('Filling scope for Category...');
  const cat1 = await prisma.$executeRaw`UPDATE "Category" SET scope = 'personal' WHERE scope IS NULL AND (user_id IS NOT NULL AND family_id IS NULL)`;
  console.log(`Updated ${cat1} categories to personal`);
  
  const cat2 = await prisma.$executeRaw`UPDATE "Category" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL`;
  console.log(`Updated ${cat2} categories to family`);

  console.log('Filling scope for Account...');
  const acc1 = await prisma.$executeRaw`UPDATE "Account" SET scope = 'personal' WHERE scope IS NULL AND is_shared = false`;
  console.log(`Updated ${acc1} accounts to personal`);
  
  const acc2 = await prisma.$executeRaw`UPDATE "Account" SET scope = 'shared' WHERE scope IS NULL AND is_shared = true`;
  console.log(`Updated ${acc2} accounts to shared`);

  console.log('Filling scope for Budget...');
  const bud1 = await prisma.$executeRaw`UPDATE "Budget" SET scope = 'personal' WHERE scope IS NULL AND family_id IS NULL`;
  console.log(`Updated ${bud1} budgets to personal`);
    
  const bud2 = await prisma.$executeRaw`UPDATE "Budget" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL`;
  console.log(`Updated ${bud2} budgets to family`);

  console.log('Filling scope for Wish...');
  const wish1 = await prisma.$executeRaw`UPDATE "Wish" SET scope = 'personal' WHERE scope IS NULL AND (is_private = true OR family_id IS NULL)`;
  console.log(`Updated ${wish1} wishes to personal`);
    
  const wish2 = await prisma.$executeRaw`UPDATE "Wish" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL AND is_private = false`;
  console.log(`Updated ${wish2} wishes to family`);

  console.log('Done!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

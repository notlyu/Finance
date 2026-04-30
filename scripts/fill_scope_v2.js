const prisma = require('../lib/prisma-client');

async function main() {
  console.log('Filling scope for Transaction...');
  const txs = await prisma.transaction.findMany({ where: { scope: null } });
  console.log(`Found ${txs.length} transactions with null scope`);
  
  for (const tx of txs) {
    let scope = 'personal';
    if (tx.family_id && !tx.is_private) scope = 'family';
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { scope }
    });
  }
  console.log(`Updated ${txs.length} transactions`);

  console.log('Filling scope for Category...');
  const cats = await prisma.category.findMany({ where: { scope: null } });
  console.log(`Found ${cats.length} categories with null scope`);
  
  for (const cat of cats) {
    let scope = 'personal';
    if (cat.family_id) scope = 'family';
    await prisma.category.update({
      where: { id: cat.id },
      data: { scope }
    });
  }
  console.log(`Updated ${cats.length} categories`);

  console.log('Filling scope for Account...');
  const accs = await prisma.account.findMany({ where: { scope: null } });
  console.log(`Found ${accs.length} accounts with null scope`);
  
  for (const acc of accs) {
    let scope = 'personal';
    if (acc.is_shared) scope = 'shared';
    await prisma.account.update({
      where: { id: acc.id },
      data: { scope }
    });
  }
  console.log(`Updated ${accs.length} accounts`);

  console.log('Filling scope for Budget...');
  const budgets = await prisma.budget.findMany({ where: { scope: null } });
  console.log(`Found ${budgets.length} budgets with null scope`);
  
  for (const b of budgets) {
    let scope = 'personal';
    if (b.family_id) scope = 'family';
    await prisma.budget.update({
      where: { id: b.id },
      data: { scope }
    });
  }
  console.log(`Updated ${budgets.length} budgets`);

  console.log('Filling scope for Wish...');
  const wishes = await prisma.wish.findMany({ where: { scope: null } });
  console.log(`Found ${wishes.length} wishes with null scope`);
  
  for (const w of wishes) {
    let scope = 'personal';
    if (w.family_id && !w.is_private) scope = 'family';
    await prisma.wish.update({
      where: { id: w.id },
      data: { scope }
    });
  }
  console.log(`Updated ${wishes.length} wishes`);

  console.log('Done!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

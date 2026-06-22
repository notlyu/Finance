const prisma = require('../lib/prisma-client');

async function main() {
  console.log('Starting scope migration...');

  // 1. Transaction
  console.log('Processing Transaction...');
  const allTxs = await prisma.transaction.findMany();
  let txCount = 0;
  for (const tx of allTxs) {
    if (tx.scope) continue; // уже заполнено
    let scope = 'personal';
    if (tx.family_id && !tx.is_private) scope = 'family';
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { scope }
    });
    txCount++;
  }
  console.log(`Updated ${txCount} transactions`);

  // 2. Category
  console.log('Processing Category...');
  const allCats = await prisma.category.findMany();
  let catCount = 0;
  for (const cat of allCats) {
    if (cat.scope) continue;
    let scope = 'personal';
    if (cat.family_id) scope = 'family';
    await prisma.category.update({
      where: { id: cat.id },
      data: { scope }
    });
    catCount++;
  }
  console.log(`Updated ${catCount} categories`);

  // 3. Account
  console.log('Processing Account...');
  const allAccs = await prisma.account.findMany();
  let accCount = 0;
  for (const acc of allAccs) {
    if (acc.scope) continue;
    let scope = 'personal';
    if (acc.is_shared) scope = 'shared';
    await prisma.account.update({
      where: { id: acc.id },
      data: { scope }
    });
    accCount++;
  }
  console.log(`Updated ${accCount} accounts`);

  // 4. Budget
  console.log('Processing Budget...');
  const allBudgets = await prisma.budget.findMany();
  let budCount = 0;
  for (const b of allBudgets) {
    if (b.scope) continue;
    let scope = 'personal';
    if (b.family_id) scope = 'family';
    await prisma.budget.update({
      where: { id: b.id },
      data: { scope }
    });
    budCount++;
  }
  console.log(`Updated ${budCount} budgets`);

  // 5. Wish
  console.log('Processing Wish...');
  const allWishes = await prisma.wish.findMany();
  let wishCount = 0;
  for (const w of allWishes) {
    if (w.scope) continue;
    let scope = 'personal';
    if (w.family_id && !w.is_private) scope = 'family';
    await prisma.wish.update({
      where: { id: w.id },
      data: { scope }
    });
    wishCount++;
  }
  console.log(`Updated ${wishCount} wishes`);

  console.log('Done!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

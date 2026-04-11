const { prisma } = require('./lib/models');

async function test() {
  // Найти транзакцию с категорией
  const t = await prisma.transaction.findFirst({
    where: { category_id: { not: null } },
    include: { category: true }
  });
  
  console.log('=== Transaction ===');
  console.log('ID:', t?.id);
  console.log('category_id:', t?.category_id);
  console.log('=== Category ===');
  console.log('category:', t?.category);
  console.log('category name:', t?.category?.name);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
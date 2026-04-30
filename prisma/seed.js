const prisma = require('../lib/prisma-client');

const systemCategories = [
  // Income categories
  { name: 'Зарплата', type: 'income', icon: 'work', is_system: true },
  { name: 'Фриланс', type: 'income', icon: 'laptop', is_system: true },
  { name: 'Инвестиции', type: 'income', icon: 'trending_up', is_system: true },
  { name: 'Подарки', type: 'income', icon: 'card_giftcard', is_system: true },
  { name: 'Прочее (доход)', type: 'income', icon: 'more_horiz', is_system: true },
  // Expense categories
  { name: 'Еда', type: 'expense', icon: 'restaurant', is_system: true },
  { name: 'Транспорт', type: 'expense', icon: 'directions_car', is_system: true },
  { name: 'Развлечения', type: 'expense', icon: 'movie', is_system: true },
  { name: 'Здоровье', type: 'expense', icon: 'local_hospital', is_system: true },
  { name: 'Образование', type: 'expense', icon: 'school', is_system: true },
  { name: 'Дом', type: 'expense', icon: 'home', is_system: true },
  { name: 'Одежда', type: 'expense', icon: 'checkroom', is_system: true },
  { name: 'Подарки', type: 'expense', icon: 'card_giftcard', is_system: true },
  { name: 'Связь', type: 'expense', icon: 'phone', is_system: true },
  { name: 'Коммуналка', type: 'expense', icon: 'power', is_system: true },
  { name: 'Без категории', type: 'expense', icon: 'receipt_long', is_system: true },
  { name: 'Пополнение целей', type: 'expense', icon: 'savings', is_system: true },
];

async function main() {
  console.log('Seeding system categories...');

  for (const cat of systemCategories) {
    const exists = await prisma.category.findFirst({
      where: { name: cat.name, type: cat.type, is_system: true }
    });

    if (!exists) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          is_system: true,
          family_id: null,
          user_id: null,
        }
      });
      console.log(`Created: ${cat.name} (${cat.type})`);
    } else {
      console.log(`Skipped (exists): ${cat.name} (${cat.type})`);
    }
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

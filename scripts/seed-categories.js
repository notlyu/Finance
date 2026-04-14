const prisma = require('./lib/prisma-client');

(async () => {
  try {
    // Create system categories
    const categories = [
      { name: 'Зарплата', type: 'income', family_id: null, user_id: null, is_system: true },
      { name: 'Продукты', type: 'expense', family_id: null, user_id: null, is_system: true },
      { name: 'Транспорт', type: 'expense', family_id: null, user_id: null, is_system: true },
      { name: 'Другое', type: 'expense', family_id: null, user_id: null, is_system: true },
      { name: 'Без категории', type: 'expense', family_id: null, user_id: null, is_system: true },
    ];
    
    for (const cat of categories) {
      try {
        await prisma.category.create({ data: cat });
        console.log('Created:', cat.name);
      } catch(e) {
        if (e.code === 'P2002') {
          console.log('Exists:', cat.name);
        } else {
          console.log('Error:', e.message);
        }
      }
    }
    
    // Verify
    const all = await prisma.category.findMany();
    console.log('Total categories:', all.length);
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
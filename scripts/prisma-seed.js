const prisma = require('./lib/prisma-client');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('Starting database seeding with Prisma...');
    
    // Hash password
    const passwordHash = await bcrypt.hash('123456', 10);
    
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password_hash: passwordHash,
          name: 'Тестовый пользователь',
          family_id: null
        }
      });
    } else {
      // Update existing user's password and name
      user = await prisma.user.update({
        where: { email: 'test@example.com' },
        data: {
          password_hash: passwordHash,
          name: 'Тестовый пользователь',
          family_id: null
        }
      });
    }
    console.log(`User: ${user.name} (id=${user.id})`);
    console.log(`Created user: ${user.name} (id=${user.id})`);
    
    // Check if family already exists for this user
    let family = await prisma.family.findFirst({
      where: { owner_user_id: user.id }
    });
    
    if (!family) {
      // Create family if doesn't exist
      family = await prisma.family.create({
        data: {
          name: 'Тестовая семья',
          invite_code: 'TEST123',
          owner_user_id: user.id
        }
      });
    } else {
      // Update existing family
      family = await prisma.family.update({
        where: { id: family.id },
        data: {
          name: 'Тестовая семья',
          invite_code: 'TEST123'
        }
      });
    }
    console.log(`Family: ${family.name} (id=${family.id})`);
    
    // Update user to belong to family
    await prisma.user.update({
      where: { id: user.id },
      data: { family_id: family.id }
    });
    console.log(`Family: ${family.name} (id=${family.id})`);
    
    // Get or create system categories
    let incomeCat = await prisma.category.findFirst({
      where: { name: 'Зарплата', type: 'income', is_system: true }
    });
    
    if (!incomeCat) {
      incomeCat = await prisma.category.create({
        data: {
          name: 'Зарплата',
          type: 'income',
          is_system: true
        }
      });
    }
    
    let expenseFood = await prisma.category.findFirst({
      where: { name: 'Продукты', type: 'expense', is_system: true }
    });
    
    if (!expenseFood) {
      expenseFood = await prisma.category.create({
        data: {
          name: 'Продукты',
          type: 'expense',
          is_system: true
        }
      });
    }
    
    let expenseTransport = await prisma.category.findFirst({
      where: { name: 'Транспорт', type: 'expense', is_system: true }
    });
    
    if (!expenseTransport) {
      expenseTransport = await prisma.category.create({
        data: {
          name: 'Транспорт',
          type: 'expense',
          is_system: true
        }
      });
    }
    
    let expenseOther = await prisma.category.findFirst({
      where: { name: 'Другое', type: 'expense', is_system: true }
    });
    
    if (!expenseOther) {
      expenseOther = await prisma.category.create({
        data: {
          name: 'Другое',
          type: 'expense',
          is_system: true
        }
      });
    }
    
    console.log('Using system categories');
    
    // Create transactions
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    
    await prisma.transaction.createMany({
      data: [
        {
          user_id: user.id,
          family_id: family.id,
          amount: 50000,
          type: 'income',
          category_id: incomeCat.id,
          date: now,
          comment: 'Зарплата',
          is_private: false
        },
        {
          user_id: user.id,
          family_id: family.id,
          amount: 3500,
          type: 'expense',
          category_id: expenseFood.id,
          date: yesterday,
          comment: 'Продукты на неделю',
          is_private: false
        },
        {
          user_id: user.id,
          family_id: family.id,
          amount: 800,
          type: 'expense',
          category_id: expenseTransport.id,
          date: twoDaysAgo,
          comment: 'Проездной',
          is_private: false
        },
        {
          user_id: user.id,
          family_id: family.id,
          amount: 2500,
          type: 'expense',
          category_id: expenseOther.id,
          date: threeDaysAgo,
          comment: 'Подарок другу',
          is_private: true // скрытая операция
        },
        {
          user_id: user.id,
          family_id: family.id,
          amount: 1200,
          type: 'expense',
          category_id: expenseFood.id,
          date: weekAgo,
          comment: 'Кафе',
          is_private: false
        }
      ]
    });
    console.log('Created transactions');
    
    // Create goals
    await prisma.goal.createMany({
      data: [
        {
          user_id: user.id,
          family_id: null,
          name: 'Новый ноутбук',
          target_amount: 80000,
          deadline: new Date(now.getFullYear(), now.getMonth() + 6, 1),
          current_amount: 15000,
          auto_contribute_enabled: false,
          auto_contribute_type: null,
          auto_contribute_value: null
        },
        {
          user_id: user.id,
          family_id: family.id,
          name: 'Отпуск',
          target_amount: 120000,
          deadline: new Date(now.getFullYear(), now.getMonth() + 9, 1),
          current_amount: 30000,
          auto_contribute_enabled: true,
          auto_contribute_type: 'percentage',
          auto_contribute_value: 10 // 10% от дохода
        }
      ]
    });
    console.log('Created goals');
    
    // Create wishes
    await prisma.wish.createMany({
      data: [
        {
          user_id: user.id,
          family_id: family.id,
          name: 'Наушники',
          cost: 12000,
          priority: 1,
          status: 'active',
          saved_amount: 3000,
          is_private: false
        },
        {
          user_id: user.id,
          family_id: family.id,
          name: 'Сюрприз для партнёра',
          cost: 5000,
          priority: 2,
          status: 'active',
          saved_amount: 0,
          is_private: true
        },
        {
          user_id: user.id,
          family_id: family.id,
          name: 'Книга',
          cost: 1500,
          priority: 5,
          status: 'active',
          saved_amount: 1500,
          is_private: false
        }
      ]
    });
    console.log('Created wishes');
    
    // Create safety pillow setting
    await prisma.safetyPillowSetting.upsert({
      where: { user_id: user.id },
      update: { months: 3 },
      create: {
        user_id: user.id,
        months: 3
      }
    });
    console.log('Created safety pillow setting');
    
    console.log('\n✅ Тестовые данные успешно добавлены!');
    console.log('Вход в приложение:');
    console.log('  Email: test@example.com');
    console.log('  Пароль: 123456');
    
  } catch (err) {
    console.error('❌ Ошибка при заполнении тестовыми данными:', err);
    process.exit(1);
  }
}

seed();
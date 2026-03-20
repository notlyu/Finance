const bcrypt = require('bcrypt');
const { sequelize, User, Family, Transaction, Category, Goal, Wish, SafetyPillowSetting } = require('./models');
const { Op } = require('sequelize');

async function seed() {
  try {
    // Подключаемся к БД
    await sequelize.authenticate();
    console.log('Подключение к БД установлено');

    // --- Проверяем, есть ли уже тестовые данные ---
    const existingUser = await User.findOne({ where: { email: 'test@example.com' } });
    if (existingUser) {
      console.log('Тестовые данные уже существуют. Очистка старых данных...');
      await User.destroy({ where: { email: 'test@example.com' } });
    }

    // --- Создаём пользователя ---
    const passwordHash = await bcrypt.hash('123456', 10);
    const user = await User.create({
      email: 'test@example.com',
      password_hash: passwordHash,
      name: 'Тестовый пользователь',
      family_id: null
    });
    console.log(`Создан пользователь: ${user.name} (id=${user.id})`);

    // --- Создаём семью ---
    const family = await Family.create({
      name: 'Тестовая семья',
      invite_code: 'TEST123',
      owner_user_id: user.id
    });
    console.log(`Создана семья: ${family.name} (id=${family.id})`);

    // Привязываем пользователя к семье
    await user.update({ family_id: family.id });

    // --- Получаем системные категории ---
    const categories = await Category.findAll({
      where: { is_system: true, family_id: null, user_id: null }
    });
    const incomeCat = categories.find(c => c.name === 'Зарплата' && c.type === 'income');
    const expenseFood = categories.find(c => c.name === 'Продукты' && c.type === 'expense');
    const expenseTransport = categories.find(c => c.name === 'Транспорт' && c.type === 'expense');
    const expenseOther = categories.find(c => c.name === 'Другое' && c.type === 'expense');

    if (!incomeCat || !expenseFood || !expenseTransport) {
      throw new Error('Не найдены необходимые системные категории. Проверьте, что SQL-скрипт выполнен.');
    }

    // --- Добавляем транзакции (доходы и расходы) ---
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);

    await Transaction.bulkCreate([
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
    ]);
    console.log('Добавлены транзакции');

    // --- Цели накоплений ---
    await Goal.bulkCreate([
      {
        user_id: user.id,
        family_id: null,
        name: 'Новый ноутбук',
        target_amount: 80000,
        target_date: new Date(now.getFullYear(), now.getMonth() + 6, 1),
        interest_rate: null,
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
        target_date: new Date(now.getFullYear(), now.getMonth() + 9, 1),
        interest_rate: 5,
        current_amount: 30000,
        auto_contribute_enabled: true,
        auto_contribute_type: 'percentage',
        auto_contribute_value: 10 // 10% от дохода
      }
    ]);
    console.log('Добавлены цели');

    // --- Желания ---
    await Wish.bulkCreate([
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
    ]);
    console.log('Добавлены желания');

    // --- Настройки подушки безопасности ---
    await SafetyPillowSetting.upsert({
      user_id: user.id,
      months: 3
    });
    console.log('Настроена подушка безопасности');

    console.log('\n✅ Тестовые данные успешно добавлены!');
    console.log('Вход в приложение:');
    console.log('  Email: test@example.com');
    console.log('  Пароль: 123456');

    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при заполнении тестовыми данными:', err);
    process.exit(1);
  }
}

seed();
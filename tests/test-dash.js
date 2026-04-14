const { Transaction, User, Category, Goal, Wish } = require('./lib/models');

(async () => {
  try {
    const userId = 6;
    
    // Test Transaction.findAll
    const txs = await Transaction.findAll({
      where: { user_id: userId, family_id: null },
      limit: 5,
      order: [['date', 'DESC'], ['id', 'DESC']],
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }, { model: Category, as: 'Category', attributes: ['name'] }],
    });
    
    console.log('Transactions:', txs.length);
  } catch(e) {
    console.log('Error:', e.message);
    console.log('Stack:', e.stack);
  }
})();
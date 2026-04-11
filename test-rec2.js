const { RecurringTransaction, Category } = require('./lib/models');

(async () => {
  try {
    const userId = 6;
    const familyId = null;
    
    const where = familyId
      ? { [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
      : { user_id: userId, family_id: null };
    
    console.log('Where:', JSON.stringify(where));
    
    const items = await RecurringTransaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['id', 'name'] }],
      order: [['active', 'DESC'], ['type', 'ASC'], ['id', 'DESC']],
    });
    
    console.log('Success! Items:', items.length);
    console.log('First item:', items[0] ? {id: items[0].id, category: items[0].Category} : 'none');
  } catch(e) {
    console.log('Error:', e.message);
    console.log('Stack:', e.stack);
  }
})();
const express = require('express');
const app = express();
const authMiddleware = require('./middleware/auth');
const { RecurringTransaction, Category } = require('./lib/models');
const { Op } = require('./lib/models');

app.use(express.json());

app.get('/test-recurring', async (req, res) => {
  console.log('[test] Starting...');
  try {
    const userId = 6;
    const where = { user_id: userId, family_id: null };
    console.log('[test] where:', where);
    const items = await RecurringTransaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['id', 'name'] }],
    });
    console.log('[test] Success, items:', items.length);
    res.json({ count: items.length });
  } catch (e) {
    console.error('[test] Error:', e.message);
    console.error('[test] Stack:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.listen(5002, () => console.log('Test server on 5002'));
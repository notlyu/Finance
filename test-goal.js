require('./start');
const { prisma } = require('./lib/models');

(async () => {
  try {
    const goal = await prisma.goal.findFirst();
    if (goal) {
      console.log('Goal fields:', Object.keys(goal));
      console.log('auto_contribute_percent exists:', goal.auto_contribute_percent !== undefined);
    } else {
      console.log('No goals found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
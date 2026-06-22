const prisma = require('../lib/prisma-client');
const { NotFoundError } = require('../lib/errors');

exports.list = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    let categories;
    if (familyId) {
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { is_system: true },
            { family_id: familyId },
            { user_id: user.id, family_id: null },  // личные категории видны всегда
          ]
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
      });
    } else {
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { is_system: true },
            { user_id: user.id, family_id: null }
          ]
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
      });
    }

    const seen = new Set();
    const uniqueCategories = [];
    for (const c of categories) {
      const key = `${c.name}|${c.type}|${c.family_id ?? 'NULL'}|${c.user_id ?? 'NULL'}|${c.is_system ? 'SYS' : 'USR'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCategories.push(c);
      }
    }

    res.json(uniqueCategories);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, type } = req.validated;
    const scope = req.body?.scope || (user.family_id ? 'family' : 'personal');
    const category = await prisma.category.create({
      data: {
        name,
        type,
        family_id: scope !== 'personal' ? user.family_id : null,
        user_id: user.id,
        is_system: false,
        scope,
      }
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name } = req.validated;

    const category = await prisma.category.findFirst({
      where: {
        id: Number(id),
        is_system: false,
        OR: [
          { user_id: user.id },
          { family_id: user.family_id }
        ]
      },
    });

    if (!category) {
      throw new NotFoundError('Категория не найдена или недоступна для редактирования');
    }

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: { name },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const category = await prisma.category.findFirst({
      where: {
        id: Number(id),
        is_system: false,
        OR: [
          { user_id: user.id },
          { family_id: user.family_id }
        ]
      },
    });
    if (!category) {
      throw new NotFoundError('Категория не найдена или недоступна для удаления');
    }
    await prisma.category.delete({ where: { id: category.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

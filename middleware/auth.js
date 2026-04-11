const jwt = require('jsonwebtoken');
const { User, Family } = require('../lib/models');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query?.token; // Bearer <token> or query param
    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: userHasFamilyInclude(),
    });
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Неверный токен' });
  }
};

function userHasFamilyInclude() {
  // Keep it optional: user may have family_id = null
  return [
    {
      model: Family,
      as: 'Family',
      required: false,
    },
  ];
}
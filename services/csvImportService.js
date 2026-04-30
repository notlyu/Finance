const prisma = require('../lib/prisma-client');

const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');
      rows.push(row);
    }
  }
  
  return rows;
};

const detectColumns = (headers) => {
  const map = {
    date: headers.find(h => /date|data|period|дата/i.test(h)),
    amount: headers.find(h => /amount|sum|сумма|стоимость/i.test(h)),
    type: headers.find(h => /type|вид|приход|расход/i.test(h)),
    category: headers.find(h => /category|категория|статья/i.test(h)),
    comment: headers.find(h => /comment|description|заметка|описание/i.test(h)),
  };
  return map;
};

const normalizeAmount = (value) => {
  if (!value) return null;
  const cleaned = String(value).replace(/[^\d.,\-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const normalizeDate = async (value) => {
  if (!value) return new Date();
  
  const datePatterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  ];
  
  for (const pattern of datePatterns) {
    const match = String(value).match(pattern);
    if (match) {
      if (pattern.source.includes('.')) {
        return new Date(match[3], match[2] - 1, match[1]);
      }
      return new Date(match[1], match[2] - 1, match[3]);
    }
  }
  
  const parsed = new Date(value);
  return isNaN(parsed) ? new Date() : parsed;
};

const detectType = (value, amount) => {
  if (value) {
    const lower = String(value).toLowerCase();
    if (lower.includes('доход') || lower.includes('income') || lower.includes('приход')) return 'income';
    if (lower.includes('расход') || lower.includes('expense')) return 'expense';
  }
  if (amount !== null && amount !== undefined) {
    return amount > 0 ? 'income' : 'expense';
  }
  return 'expense';
};

const guessCategory = async (comment, type) => {
  if (!comment) return null;
  
  const keywords = {
    'Продукты': ['пятёрочка', 'магнит', 'перекрёсток', 'ашан', 'продукт', 'еда', 'овощи', 'фрукты'],
    'Транспорт': ['такси', 'uber', 'яндекс', 'газель', 'автобус', 'метро', 'транспорт'],
    'Связь': ['мтс', 'мегафон', 'билайн', 'теле2', ' связь', 'интернет'],
    'Коммуналка': ['жкх', 'вода', 'свет', 'газ', 'коммунал'],
    'Развлечения': ['кино', 'театр', 'концерт', 'игра'],
    'Здоровье': ['аптека', 'врач', 'больница', 'медицин'],
    'Одежда': ['одежда', 'магазин', 'ток'],
    'Зарплата': ['зарплата', 'аванс', ' оклад', 'премия'],
  };
  
  const commentLower = comment.toLowerCase();
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(w => commentLower.includes(w))) {
      const cat = await prisma.category.findFirst({
        where: { name: { contains: category, mode: 'insensitive' }, type }
      });
      if (cat) return cat.id;
    }
  }
  
  return null;
};

exports.importMappedData = async (userId, familyId, data, mapping) => {
  const results = { imported: 0, skipped: 0, errors: [] };
  
  const defaultCategory = await prisma.category.findFirst({
    where: { name: 'Прочее', type: 'expense' }
  });
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const amount = normalizeAmount(row[mapping.amount]);
      if (!amount || amount === 0) {
        results.skipped++;
        continue;
      }
      
      const date = await normalizeDate(row[mapping.date]);
      const type = mapping.type ? detectType(row[mapping.type], amount) : (amount > 0 ? 'income' : 'expense');
      let categoryId = defaultCategory?.id;
      
      if (mapping.category) {
        const cat = await prisma.category.findFirst({
          where: { name: { contains: row[mapping.category], mode: 'insensitive' }, type }
        });
        if (cat) categoryId = cat.id;
      } else if (mapping.comment) {
        categoryId = await guessCategory(row[mapping.comment], type) || categoryId;
      }
      
      const comment = mapping.comment ? row[mapping.comment] : 'Импортировано из CSV';
      
      await prisma.transaction.create({
        data: {
          user_id: userId,
          family_id: familyId,
          category_id: categoryId,
          amount: Math.abs(amount),
          type,
          date,
          comment,
          scope: 'personal',
        }
      });
      
      results.imported++;
    } catch (err) {
      results.errors.push(`Строка ${i + 1}: ${err.message}`);
      results.skipped++;
    }
  }
  
  return results;
};

exports.importCSV = async (userId, familyId, csvContent) => {
  const rows = parseCSV(csvContent);
  if (rows.length === 0) {
    throw new Error('Не удалось распознать CSV файл');
  }
  
  const columns = detectColumns(Object.keys(rows[0]));
  const results = { imported: 0, skipped: 0, errors: [] };
  
  const defaultCategory = await prisma.category.findFirst({
    where: { name: 'Прочее', type: 'expense' }
  });
  
  for (const row of rows) {
    try {
      const amount = normalizeAmount(row[columns.amount]);
      if (!amount || amount === 0) {
        results.skipped++;
        continue;
      }
      
      const date = await normalizeDate(row[columns.date]);
      const type = detectType(row[columns.type], amount);
      let categoryId = defaultCategory?.id;
      
      if (columns.category) {
        const cat = await prisma.category.findFirst({
          where: { name: { contains: row[columns.category], mode: 'insensitive' }, type }
        });
        if (cat) categoryId = cat.id;
      } else if (columns.comment) {
        categoryId = await guessCategory(row[columns.comment], type) || categoryId;
      }
      
      const comment = columns.comment ? row[columns.comment] : 'Импортировано из CSV';
      
      await prisma.transaction.create({
        data: {
          user_id: userId,
          family_id: familyId,
          category_id: categoryId,
          amount: Math.abs(amount),
          type,
          date,
          comment,
          scope: 'personal',
        }
      });
      
      results.imported++;
    } catch (err) {
      results.errors.push(err.message);
      results.skipped++;
    }
  }
  
  return results;
};

exports.getImportTemplate = () => {
  return {
    columns: ['date', 'amount', 'category', 'comment'],
    example: [
      '2024-01-15,5000,Зарплата,Зарплата за январь',
      '2024-01-16,1500,Продукты,Пятёрочка',
      '2024-01-17,300,Транспорт,Такси',
    ],
  };
};

module.exports = exports;
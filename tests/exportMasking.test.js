const request = require('supertest');
const ExcelJS = require('exceljs');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// Регрессия: в Excel/PDF-экспорте семьи СЕМЕЙНЫЕ операции партнёра
// маскировались (scope truthy для 'family') и зануливались. Должно маскироваться
// только чужое ЛИЧНОЕ (scope='personal'); семейное видно обоим.

let owner, ownerToken, member, family, famCat;
const FAMILY_AMOUNT = 12345;
const PRIVATE_AMOUNT = 9876;

function binaryParser(res, callback) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

async function exportRows(token) {
  const res = await request(app)
    .get('/api/reports/export/excel')
    .set('Authorization', `Bearer ${token}`)
    .buffer()
    .parse(binaryParser);
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.body);
  const sheet = wb.getWorksheet('Операции');
  const rows = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return; // header
    rows.push({ category: String(row.getCell(3).value), amount: Number(row.getCell(4).value) });
  });
  return rows;
}

beforeAll(async () => {
  owner = await createTestUser({ name: 'Exp Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });

  member = await createTestUser({ name: 'Exp Member' });
  await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });

  famCat = await createTestCategory({ type: 'expense', name: 'ExpCat', family_id: family.id });

  const today = new Date();
  await prisma.transaction.createMany({
    data: [
      // СЕМЕЙНАЯ операция партнёра — должна быть видна владельцу
      { user_id: member.id, family_id: family.id, category_id: famCat.id, type: 'expense', amount: FAMILY_AMOUNT, scope: 'family', date: today },
      // ЛИЧНАЯ операция партнёра (family_id проставлен, как делает createTransaction) — должна маскироваться
      { user_id: member.id, family_id: family.id, category_id: famCat.id, type: 'expense', amount: PRIVATE_AMOUNT, scope: 'personal', date: today },
    ],
  });
}, 30000);

afterAll(async () => {
  await prisma.familySettings.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await prisma.transaction.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await cleanupUser(member?.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

describe('Export masking (family vs personal)', () => {
  test('partner FAMILY transaction is visible, PERSONAL is masked', async () => {
    const rows = await exportRows(ownerToken);

    const familyRow = rows.find((r) => r.amount === FAMILY_AMOUNT);
    expect(familyRow).toBeDefined();
    expect(familyRow.category).not.toContain('🔒');

    // личная партнёра занулена и помечена
    expect(rows.some((r) => r.amount === PRIVATE_AMOUNT)).toBe(false);
    expect(rows.some((r) => r.category.includes('🔒'))).toBe(true);
  });

  test('transparent mode: partner PERSONAL transaction becomes visible', async () => {
    await prisma.familySettings.upsert({
      where: { family_id: family.id },
      update: { show_personal_in_stats: true },
      create: { family_id: family.id, show_personal_in_stats: true },
    });

    const rows = await exportRows(ownerToken);
    expect(rows.some((r) => r.amount === PRIVATE_AMOUNT)).toBe(true);
    expect(rows.some((r) => r.category.includes('🔒'))).toBe(false);
  });
});

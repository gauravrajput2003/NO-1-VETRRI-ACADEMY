const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('../../client/node_modules/xlsx');
const { createWorkbook } = require('../../server/utils/excelWorkbook');
test('actual Excel workbook round-trips Tamil names, numeric zero, multiple sheets and safe formula-like names', () => {
  const buffer = createWorkbook([{ name: 'Ratings', headers: ['Teacher', 'Score'], rows: [['தமிழ் ஆசிரியர் & <name>', 0], ['=HYPERLINK("bad")', 98.5]] }, { name: 'Evidence', headers: ['Count'], rows: [[3]] }]);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  assert.deepEqual(workbook.SheetNames, ['Ratings', 'Evidence']);
  assert.equal(workbook.Sheets.Ratings.A2.v, 'தமிழ் ஆசிரியர் & <name>');
  assert.equal(workbook.Sheets.Ratings.B2.v, 0);
  assert.equal(workbook.Sheets.Ratings.A3.f, undefined);
  assert.equal(workbook.Sheets.Ratings.A3.v, '=HYPERLINK("bad")');
  assert.equal(workbook.Sheets.Evidence.A2.v, 3);
});

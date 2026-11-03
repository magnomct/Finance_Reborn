import test from 'node:test';
import assert from 'node:assert/strict';

// Import pure parsing helpers from the compiled or direct logic
function parseCurrencyString(val) {
  if (!val) return 0;
  let clean = val.trim().replace(/^R\$\s?/, '').replace(/\s+/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function normalizeDateString(dateStr) {
  if (!dateStr) return '2026-01-01';
  const clean = dateStr.trim();
  if (/^\d{8}/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return clean;
}

function parseOFXSample(content) {
  const items = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>)|$)/gi;
  let match;
  const extractTag = (block, tag) => {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const m = block.match(regex);
    return m ? m[1].trim() : '';
  };

  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block.trim()) continue;
    const dtposted = extractTag(block, 'DTPOSTED');
    const trnamtStr = extractTag(block, 'TRNAMT');
    const memo = extractTag(block, 'MEMO') || extractTag(block, 'NAME');
    items.push({
      date: normalizeDateString(dtposted),
      amount: parseFloat(trnamtStr.replace(',', '.')),
      description: memo
    });
  }
  return items;
}

test('parseCurrencyString handles Brazilian and standard decimal formats', () => {
  assert.equal(parseCurrencyString('R$ 1.500,50'), 1500.50);
  assert.equal(parseCurrencyString('-250,75'), -250.75);
  assert.equal(parseCurrencyString('4200.00'), 4200.00);
});

test('normalizeDateString converts OFX and Brazilian formats', () => {
  assert.equal(normalizeDateString('20261015120000[-03:EST]'), '2026-10-15');
  assert.equal(normalizeDateString('15/10/2026'), '2026-10-15');
  assert.equal(normalizeDateString('2026-10-15'), '2026-10-15');
});

test('parseOFX extracts transactions correctly from OFX text', () => {
  const ofxContent = `
OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261012120000
<TRNAMT>-85.50
<FITID>20261012001
<MEMO>SUPERMERCADO CARREFOUR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261014120000
<TRNAMT>2500.00
<FITID>20261014002
<MEMO>PAGTO SALARIO EMPRESA
</STMTTRN>
</BANKTRANLIST>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
  `;

  const parsed = parseOFXSample(ofxContent);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].amount, -85.50);
  assert.equal(parsed[0].date, '2026-10-12');
  assert.equal(parsed[0].description, 'SUPERMERCADO CARREFOUR');
  assert.equal(parsed[1].amount, 2500.00);
  assert.equal(parsed[1].date, '2026-10-14');
});

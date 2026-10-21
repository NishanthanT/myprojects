// Actual engine smoke test, without a paid service or CDN. Pass a synthetic bill PNG.
import { createWorker } from 'tesseract.js';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parseBillText } from '../src/utils/billOcrParser.mjs';
const fixture = process.argv[2];
if (!fixture) throw new Error('Usage: node scripts/test-local-ocr.mjs <synthetic-bill.png>');
const worker = await createWorker('eng', 1, {
  langPath: fileURLToPath(new URL('../public/ocr/lang', import.meta.url)),
  cacheMethod: 'none', gzip: true
});
try {
  await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
  const { data } = await worker.recognize(fixture);
  const result = parseBillText(data.text);
  assert.equal(result.rows.length, 2, `Expected two products. OCR text:\n${data.text}`);
  assert.equal(result.rows[0].quantity, 10);
  assert.equal(result.rows[0].price, 800);
  assert.equal(result.rows[1].quantity, 2);
  assert.equal(result.rows[1].price, 500);
  assert.equal(result.bill.expected_total, 9000);
  // Load both additional local language packs as a compatibility check.
  await worker.reinitialize('eng+tam+sin');
  console.log('PASS: local image OCR -> two review rows, quantities/prices/total; all three language packs load.');
} finally { await worker.terminate(); }

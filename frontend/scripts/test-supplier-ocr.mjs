import { createWorker } from 'tesseract.js';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { reconstructBillText } from '../src/utils/billOcrLayout.mjs';
import { parseBillText } from '../src/utils/billOcrParser.mjs';
import { calculateBill } from '../src/utils/billImport.mjs';
import { rotateBillPixels } from '../src/utils/rotateBillPixels.mjs';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import bmp from 'bmp-js';
const worker = await createWorker('eng', 1, { langPath: fileURLToPath(new URL('../public/ocr/lang', import.meta.url)), cacheMethod: 'none', gzip: true });
try {
  await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
  const sideways = bmp.decode(gunzipSync(await readFile(new URL('../tests/fixtures/supplier-bill-sideways.bmp.gz', import.meta.url))));
  // Run the same pixel rotation as the browser, not Tesseract's cropping rotateRadians option.
  const restored = rotateBillPixels(sideways.data, sideways.width, sideways.height, -90);
  assert.equal(restored.width, 1600); assert.equal(restored.height, 650);
  for (const [file, image] of [['supplier-bill.png', fileURLToPath(new URL('../tests/fixtures/supplier-bill.png', import.meta.url))], ['sideways image after app rotation', bmp.encode({ ...restored, data: Buffer.from(restored.data) }).data]]) {
    const { data } = await worker.recognize(image, { rotateAuto: true }, { text: true, tsv: true });
    const layout = reconstructBillText(data.tsv, data.text);
    const parsed = parseBillText(layout.text);
    assert.equal(parsed.rows.length, 4, layout.text);
    assert.deepEqual(parsed.rows.map(r => r.discount_type), ['percent', 'percent', 'percent', 'percent']);
    const totals = calculateBill({ ...parsed.bill, transport_mode: 'quantity' }, parsed.rows);
    assert.equal(totals.total, 31278.75, layout.text);
    assert.deepEqual(totals.lines.map(r => r.unitCost), [1256.25, 73.5, 2242.5, 3150]);
    console.log(`PASS ${file}: 4 products, 25% discount, Rs.31,278.75 total.`);
  }
} finally { await worker.terminate(); }

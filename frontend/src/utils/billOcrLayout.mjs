// Reconstruct physical invoice rows from OCR word coordinates, including wrapped names.
// Text-only OCR can output Rate/Amount columns in a different reading order.
export function tsvWords(tsv) {
  if (typeof tsv !== 'string') return [];
  return tsv.split(/\r?\n/).slice(1).map(line => {
    const c = line.split('\t');
    return { level: Number(c[0]), x: Number(c[6]), y: Number(c[7]), width: Number(c[8]), height: Number(c[9]), text: c.slice(11).join('\t').trim() };
  }).filter(w => w.level === 5 && w.text && [w.x, w.y, w.width, w.height].every(Number.isFinite) && w.height > 0);
}
function visualLines(words) {
  const lines = [];
  for (const word of [...words].sort((a, b) => a.y + a.height / 2 - b.y - b.height / 2)) {
    const cy = word.y + word.height / 2;
    const line = lines.find(l => Math.abs(l.cy - cy) <= Math.min(l.height, word.height) * 0.55);
    if (line) { line.words.push(word); line.cy = line.words.reduce((s, w) => s + w.y + w.height / 2, 0) / line.words.length; }
    else lines.push({ cy, height: word.height, words: [word] });
  }
  return lines.sort((a, b) => a.cy - b.cy).map(l => ({ ...l, words: l.words.sort((a, b) => a.x - b.x), text: l.words.sort((a, b) => a.x - b.x).map(w => w.text).join(' ') }));
}
const headerKey = text => {
  const s = text.toLowerCase().replace(/[^a-z%]/g, '');
  if (/^(sn|sno|serial)$/.test(s)) return 'serial';
  if (/^(code|sku)$/.test(s)) return 'code';
  if (/^(ean|barcode)$/.test(s)) return 'ean';
  if (/^(qty|quantity)$/.test(s)) return 'quantity';
  if (s === 'unit') return 'unit';
  if (/^(item|itemname|description|particulars|product|productname)$/.test(s)) return 'name';
  if (/^(bin|binloc|binlocation)$/.test(s)) return 'bin';
  if (/^(rate|price)$/.test(s)) return 'price';
  if (/^(dis|disc|discount)%?$/.test(s)) return 'discount';
  if (/^(amount|total)$/.test(s)) return 'total';
  return null;
};
export function reconstructBillText(tsv, fallback = '') {
  const words = tsvWords(tsv), lines = visualLines(words);
  const headings = lines.find(l => /\b(?:qty|quantity)\b/i.test(l.text) && /\b(?:rate|price)\b/i.test(l.text) && /\b(?:amount|total)\b/i.test(l.text) && /\b(?:item|description|product|particulars)\b/i.test(l.text));
  if (!headings) return { text: fallback, reconstructed: false };
  const anchors = headings.words.map(w => ({ ...w, key: headerKey(w.text) })).filter(w => w.key);
  if (new Set(anchors.map(a => a.key)).size !== anchors.length || !anchors.some(a => a.key === 'code')) return { text: fallback, reconstructed: false };
  const boundaries = anchors.slice(1).map((a, i) => ['code', 'ean', 'name'].includes(anchors[i].key)
    ? a.x - headings.height * 0.5
    : anchors[i].x + anchors[i].width + (a.x - anchors[i].x - anchors[i].width) * 0.25);
  const column = word => anchors[boundaries.findIndex(x => word.x < x) < 0 ? anchors.length - 1 : boundaries.findIndex(x => word.x < x)].key;
  const footer = lines.find(l => l.cy > headings.cy && /\b(?:grand\s*total|net\s*(?:total|amount)|sub\s*total|total\s*due)\b/i.test(l.text));
  const endY = footer?.cy - footer.height / 2 || Infinity;
  const body = words.filter(w => w.y + w.height / 2 > headings.cy + headings.height * 0.7 && w.y < endY);
  const codeWords = body.filter(w => column(w) === 'code' && /^[A-Z0-9][A-Z0-9./_-]*$/i.test(w.text) && /\d/.test(w.text));
  if (!codeWords.length || codeWords.length > 200) return { text: fallback, reconstructed: false };
  codeWords.sort((a, b) => a.y - b.y);
  const centers = codeWords.map(w => w.y + w.height / 2);
  const rows = codeWords.map((code, i) => {
    const top = i ? (centers[i - 1] + centers[i]) / 2 : headings.cy + headings.height * 0.7;
    const bottom = i + 1 < centers.length ? (centers[i] + centers[i + 1]) / 2 : endY;
    const cells = Object.fromEntries(anchors.map(a => [a.key, []]));
    for (const line of visualLines(body.filter(w => w.y + w.height / 2 >= top && w.y + w.height / 2 < bottom))) {
      for (const word of line.words) cells[column(word)].push(word.text);
    }
    return cells;
  });
  const keys = anchors.map(a => a.key);
  const labels = { serial: 'S.N', code: 'Code', ean: 'EAN', quantity: 'Qty', unit: 'Unit', name: 'Item Name', bin: 'Bin Loc', price: 'Rate', discount: /%/.test(headings.text) ? 'Discount %' : 'Discount', total: 'Amount' };
  const before = lines.filter(l => l.cy < headings.cy).map(l => l.text);
  const after = lines.filter(l => l.cy >= (footer?.cy || Infinity)).map(l => l.text);
  const table = rows.map(cells => keys.map(key => cells[key].join(key === 'ean' ? '' : ' ')).join(' | '));
  return { text: [...before, keys.map(k => labels[k]).join(' | '), ...table, ...after].join('\n'), reconstructed: true };
}

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public', 'ocr');
const packageRoot = name => dirname(require.resolve(`${name}/package.json`));
await mkdir(join(output, 'core'), { recursive: true });
await mkdir(join(output, 'lang'), { recursive: true });
await mkdir(join(output, 'licenses'), { recursive: true });
const tessRoot = packageRoot('tesseract.js');
const coreRoot = packageRoot('tesseract.js-core');
await copyFile(join(tessRoot, 'dist', 'worker.min.js'), join(output, 'worker.min.js'));
for (const name of await readdir(coreRoot)) {
  if (/^tesseract-core.*\.(?:wasm|js)$/.test(name)) await copyFile(join(coreRoot, name), join(output, 'core', name));
}
async function findData(folder, file) {
  const found = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...await findData(join(folder, entry.name), file));
    else if (entry.name === file) found.push(join(folder, entry.name));
  }
  return found;
}
for (const lang of ['eng', 'tam', 'sin']) {
  const candidates = await findData(packageRoot(`@tesseract.js-data/${lang}`), `${lang}.traineddata.gz`);
  const data = candidates.find(p => p.includes('best_int')) || candidates[0];
  if (!data) throw new Error(`Missing local OCR language data: ${lang}`);
  await copyFile(data, join(output, 'lang', `${lang}.traineddata.gz`));
}
const versions = {};
for (const name of ['tesseract.js', 'tesseract.js-core', '@tesseract.js-data/eng', '@tesseract.js-data/tam', '@tesseract.js-data/sin']) {
  const folder = packageRoot(name);
  const pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
  versions[name] = { version: pkg.version, license: pkg.license };
  for (const file of await readdir(folder)) if (/^(license|copying|notice)(\.|$)/i.test(file)) {
    await copyFile(join(folder, file), join(output, 'licenses', `${name.replace(/[@/]/g, '_')}-${file}`));
  }
}
await writeFile(join(output, 'manifest.json'), JSON.stringify({ languages: ['eng', 'tam', 'sin'], packages: versions }, null, 2));
console.log('Free local OCR assets prepared: English, Tamil, Sinhala. No external OCR requests.');

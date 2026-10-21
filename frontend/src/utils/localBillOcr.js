// All OCR assets are served by this app. No paid API or external image upload.
import { reconstructBillText } from './billOcrLayout.mjs';
import { parseBillText } from './billOcrParser.mjs';
import { rotateBillPixels } from './rotateBillPixels.mjs';

export async function rotateBillPhoto(source, degrees) {
  if (!degrees) return source;
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const rotated = rotateBillPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, degrees);
  canvas.width = rotated.width; canvas.height = rotated.height;
  context.putImageData(new ImageData(rotated.data, rotated.width, rotated.height), 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}
export async function readBillPhoto(source, { language = 'eng', signal, onProgress = () => {} } = {}) {
  if (!['eng', 'eng+tam', 'eng+sin'].includes(language)) throw new Error('Choose a supported OCR language.');
  const stopped = () => new DOMException('Photo reading cancelled.', 'AbortError');
  if (signal?.aborted) throw stopped();
  const { createWorker } = await import('tesseract.js');
  if (signal?.aborted) throw stopped();
  let worker, finished = false, timer, abort;
  let rejectFailure;
  const failure = new Promise((_, reject) => { rejectFailure = reject; });
  abort = () => rejectFailure(stopped());
  signal?.addEventListener('abort', abort, { once: true });
  timer = setTimeout(() => rejectFailure(new Error('Photo reading took too long. Try a smaller, clearer image.')), 180000);
  const assets = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href;
  const recognize = async () => {
    const created = await createWorker(language, 1, {
      workerPath: `${assets}worker.min.js`, corePath: `${assets}core`, langPath: `${assets}lang`,
      workerBlobURL: false, gzip: true,
      logger: event => { if (!finished) onProgress(event); },
      errorHandler: error => rejectFailure(new Error(String(error?.message || error)))
    });
    worker = created;
    if (finished || signal?.aborted) { await worker.terminate(); throw stopped(); }
    // Single-block mode keeps invoice columns on the same horizontal text line.
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
    let best;
    for (const rotation of [0, -90, 90, 180]) {
      if (finished || signal?.aborted) throw stopped();
      onProgress({ status: 'checking orientation', rotation });
      const orientedSource = await rotateBillPhoto(source, rotation);
      const { data } = await worker.recognize(orientedSource, { rotateAuto: true }, { text: true, tsv: true });
      const layout = reconstructBillText(data.tsv, data.text || '');
      let rows = [];
      try { rows = parseBillText(layout.text).rows; } catch { /* Try another orientation. */ }
      const valid = rows.filter(r => r.quantity !== '' && r.price !== '').length;
      const score = valid * 100 + rows.length * 20 + (layout.reconstructed ? 40 : 0) + Number(data.confidence || 0) / 10;
      const candidate = { text: layout.text, confidence: data.confidence, rotation, orientedSource, score };
      if (!best || candidate.score > best.score) best = candidate;
      if (valid > 0 && data.confidence >= 45) break;
    }
    return best;
  };
  try { return await Promise.race([recognize(), failure]); }
  finally {
    finished = true;
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (worker) await worker.terminate().catch(() => {});
  }
}

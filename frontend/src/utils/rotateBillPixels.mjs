// Exact quarter turns, with swapped dimensions: never crop a sideways invoice.
export function rotateBillPixels(data, width, height, degrees) {
  const angle = ((degrees % 360) + 360) % 360;
  if (![0, 90, 180, 270].includes(angle) || data.length !== width * height * 4) throw new Error('Invalid invoice rotation.');
  const sideways = angle === 90 || angle === 270;
  const outWidth = sideways ? height : width, outHeight = sideways ? width : height;
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = angle === 90 ? height - y - 1 : angle === 270 ? y : angle === 180 ? width - x - 1 : x;
    const dy = angle === 90 ? x : angle === 270 ? width - x - 1 : angle === 180 ? height - y - 1 : y;
    const from = (y * width + x) * 4, to = (dy * outWidth + dx) * 4;
    for (let c = 0; c < 4; c++) output[to + c] = data[from + c];
  }
  return { data: output, width: outWidth, height: outHeight };
}

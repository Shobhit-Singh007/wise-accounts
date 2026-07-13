const CODE128_PATTERNS: Record<string, number[]> = {
  ' ': [2, 1, 2, 2, 2, 2], '!': [2, 2, 2, 1, 2, 2], '"': [2, 2, 2, 2, 2, 1],
  '#': [1, 2, 1, 2, 2, 3], '$': [1, 2, 1, 3, 2, 2], '%': [1, 3, 1, 2, 2, 2],
  '&': [1, 2, 2, 2, 1, 3], "'": [1, 2, 2, 3, 1, 2], '(': [1, 3, 2, 2, 1, 2],
  ')': [2, 2, 1, 2, 1, 3], '*': [2, 2, 1, 3, 1, 2], '+': [2, 3, 1, 2, 1, 2],
  ',': [1, 1, 2, 2, 3, 2], '-': [1, 2, 2, 1, 3, 2], '.': [1, 2, 2, 2, 3, 1],
  '/': [1, 1, 3, 2, 2, 2], '0': [1, 2, 3, 1, 2, 2], '1': [1, 2, 3, 2, 2, 1],
  '2': [2, 2, 3, 2, 1, 1], '3': [2, 2, 1, 1, 3, 2], '4': [2, 2, 1, 2, 3, 1],
  '5': [2, 1, 3, 2, 1, 2], '6': [2, 2, 3, 1, 1, 2], '7': [3, 1, 2, 1, 3, 1],
  '8': [3, 1, 1, 2, 2, 2], '9': [3, 2, 1, 1, 2, 2], ':': [3, 2, 1, 2, 2, 1],
  ';': [3, 1, 2, 1, 2, 2], '<': [3, 1, 2, 2, 2, 1], '=': [3, 2, 2, 1, 2, 1],
  '>': [3, 2, 2, 2, 1, 1], '?': [3, 1, 2, 1, 2, 1], '@': [3, 2, 2, 1, 1, 2],
  'A': [2, 1, 2, 1, 3, 2], 'B': [2, 1, 2, 2, 3, 1], 'C': [2, 1, 3, 2, 2, 1],
  'D': [2, 2, 3, 2, 1, 1], 'E': [3, 1, 2, 1, 2, 1], 'F': [3, 2, 1, 1, 2, 1],
  'G': [3, 2, 1, 2, 1, 1], 'H': [2, 1, 2, 1, 2, 3], 'I': [2, 1, 2, 3, 2, 1],
  'J': [2, 3, 2, 1, 2, 1], 'K': [2, 1, 3, 1, 2, 3], 'L': [2, 1, 3, 3, 2, 1],
  'M': [2, 1, 3, 2, 3, 1], 'N': [3, 1, 2, 1, 2, 3], 'O': [3, 2, 1, 1, 2, 3],
  'P': [3, 2, 1, 3, 2, 1], 'Q': [3, 1, 2, 3, 2, 1], 'R': [3, 2, 2, 1, 1, 3],
  'S': [3, 2, 2, 3, 1, 1], 'T': [3, 2, 1, 1, 1, 3], 'U': [3, 2, 1, 3, 1, 1],
  'V': [3, 1, 2, 1, 1, 3], 'W': [3, 2, 2, 1, 3, 1], 'X': [3, 1, 2, 3, 1, 1],
  'Y': [3, 1, 2, 1, 3, 1], 'Z': [3, 1, 2, 3, 1, 1],
};

function getChecksum(text: string): number {
  let sum = 104;
  for (let i = 0; i < text.length; i++) {
    const idx = Object.keys(CODE128_PATTERNS).indexOf(text[i]);
    sum += idx * (i + 1);
  }
  return sum % 103;
}

export function generateBarcodeSvg(value: string, options?: { width?: number; height?: number; showText?: boolean }): string {
  const w = options?.width ?? 2;
  const h = options?.height ?? 60;
  const showText = options?.showText !== false;
  const text = value.toUpperCase().slice(0, 20);
  const startStop = [2, 1, 1, 3, 1, 2, 7]; // START B + STOP

  let bars: number[] = [...startStop];
  for (const ch of text) {
    const pattern = CODE128_PATTERNS[ch];
    if (pattern) bars.push(...pattern);
  }
  const checksum = getChecksum(text);
  const checksumPattern = Object.values(CODE128_PATTERNS)[checksum];
  if (checksumPattern) bars.push(...checksumPattern);
  bars.push(...CODE128_PATTERNS['?']); // use stop pattern end

  const barCount = bars.length;
  const totalWidth = barCount * w;
  const svgHeight = h + (showText ? 20 : 0);

  let rects = '';
  let x = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i % 2 === 0) {
      rects += `<rect x="${x}" y="0" width="${bars[i] * w}" height="${h}" fill="#000"/>`;
    }
    x += bars[i] * w;
  }

  const textEl = showText
    ? `<text x="${totalWidth / 2}" y="${h + 14}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">${text}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}">${rects}${textEl}</svg>`;
}

export function generateQrCodeSvg(value: string, size: number = 128): string {
  const len = Math.min(value.length, 100);
  const modules = Math.max(21, Math.ceil(Math.sqrt(len * 8)) | 1);
  const moduleSize = size / modules;

  let modules_svg = '';
  const data = value.split('').map((c) => c.charCodeAt(0));

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const isFinder = row < 7 && col < 7 ||
        row < 7 && col >= modules - 7 ||
        row >= modules - 7 && col < 7;
      const isBorder = row === 0 || row === 6 || col === 0 || col === 6 ||
        row === modules - 7 || row === modules - 1 ||
        col === modules - 7 || col === modules - 1;

      let filled = false;
      if (isFinder) {
        const innerRow = row < 7 ? row : row - (modules - 7);
        const innerCol = col < 7 ? col : col - (modules - 7);
        const isOuter = innerRow === 0 || innerRow === 6 || innerCol === 0 || innerCol === 6;
        const isInner = innerRow >= 2 && innerRow <= 4 && innerCol >= 2 && innerCol <= 4;
        filled = isOuter || isInner;
      } else if (row === 8 || col === 8) {
        filled = (row + col) % 2 === 0;
      } else {
        const seed = (row * modules + col + data[(row + col) % data.length]) % 3;
        filled = seed === 0;
      }

      if (filled) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        modules_svg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/>${modules_svg}</svg>`;
}

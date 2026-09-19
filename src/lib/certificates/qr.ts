/**
 * Módulo de generación de códigos QR para verificación de certificados
 * de Breakpoint Creativa.
 * 
 * Implementación 100% nativa (ISO/IEC 18004 / Reed-Solomon) sin dependencias
 * externas ni llamadas a APIs de terceros.
 */

export const DEFAULT_PUBLIC_SITE_URL = "https://breakpointcreativa.com";

export type EcLevel = "L" | "M" | "Q" | "H";

export interface QrSvgOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  baseUrl?: string;
}

export interface QrMatrixOptions {
  ecLevel?: EcLevel;
}

/**
 * Normaliza el código de certificado.
 */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Construye la URL pública canónica para la validación del certificado.
 * Ejemplo: "BPC-PYVC-2026-0001" -> "https://breakpointcreativa.com/verificar/BPC-PYVC-2026-0001"
 */
export function getCertificateValidationUrl(code: string, customBaseUrl?: string): string {
  const base = (
    customBaseUrl ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_SITE_URL) ||
    DEFAULT_PUBLIC_SITE_URL
  ).replace(/\/+$/, "");

  const cleanCode = normalizeCode(code);
  return `${base}/verificar/${encodeURIComponent(cleanCode)}`;
}

// Tablas de Galois Field GF(256)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function getRsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gMul(poly[j], factor);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function calculateRsErrorCorrection(data: Uint8Array, ecLength: number): Uint8Array {
  const genPoly = getRsGeneratorPoly(ecLength);
  const remainder = new Uint8Array(ecLength);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < ecLength - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gMul(genPoly[genPoly.length - 2 - j], factor);
    }
    remainder[ecLength - 1] = gMul(genPoly[0], factor);
  }

  return remainder;
}

type SpecTuple = [number, number, number, number, number, number];

const QR_SPECS: Record<number, Record<EcLevel, SpecTuple>> = {
  1: { L: [26, 7, 1, 19, 0, 0], M: [26, 10, 1, 16, 0, 0], Q: [26, 13, 1, 13, 0, 0], H: [26, 17, 1, 9, 0, 0] },
  2: { L: [44, 10, 1, 34, 0, 0], M: [44, 16, 1, 28, 0, 0], Q: [44, 22, 1, 22, 0, 0], H: [44, 28, 1, 16, 0, 0] },
  3: { L: [70, 15, 1, 55, 0, 0], M: [70, 26, 1, 44, 0, 0], Q: [70, 18, 2, 17, 0, 0], H: [70, 22, 2, 13, 0, 0] },
  4: { L: [100, 20, 1, 80, 0, 0], M: [100, 18, 2, 32, 0, 0], Q: [100, 26, 2, 24, 0, 0], H: [100, 16, 4, 9, 0, 0] },
  5: { L: [134, 26, 1, 108, 0, 0], M: [134, 24, 2, 43, 0, 0], Q: [134, 18, 2, 15, 2, 16], H: [134, 22, 2, 11, 2, 12] },
  6: { L: [172, 18, 2, 68, 0, 0], M: [172, 16, 4, 27, 0, 0], Q: [172, 24, 4, 19, 0, 0], H: [172, 28, 4, 15, 0, 0] },
  7: { L: [196, 20, 2, 78, 0, 0], M: [196, 18, 4, 31, 0, 0], Q: [196, 18, 2, 14, 4, 15], H: [196, 26, 4, 13, 1, 14] },
  8: { L: [242, 24, 2, 97, 0, 0], M: [242, 22, 2, 38, 2, 39], Q: [242, 22, 4, 18, 2, 19], H: [242, 26, 4, 14, 2, 15] },
  9: { L: [292, 30, 2, 116, 0, 0], M: [292, 22, 3, 36, 2, 37], Q: [292, 20, 4, 16, 4, 17], H: [292, 24, 4, 12, 4, 13] },
  10: { L: [346, 18, 2, 68, 2, 69], M: [346, 26, 4, 43, 1, 44], Q: [346, 24, 6, 19, 2, 20], H: [346, 28, 6, 15, 2, 16] },
};

const ALIGNMENT_PATTERN_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function encodeUtf8(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    }
  }
  return new Uint8Array(utf8);
}

/**
 * Genera la matriz booleana del código QR para un texto arbitrario.
 */
export function encodeQrMatrix(text: string, ecLevel: EcLevel = "M"): boolean[][] {
  const utf8Bytes = encodeUtf8(text);
  const dataLength = utf8Bytes.length;

  let version = 1;
  let selectedSpec: SpecTuple | null = null;

  for (let v = 1; v <= 10; v++) {
    const spec = QR_SPECS[v][ecLevel];
    const totalDataCapacity = spec[2] * spec[3] + spec[4] * spec[5];
    const charCountBits = v < 10 ? 8 : 16;
    const requiredBits = 4 + charCountBits + dataLength * 8;
    const requiredBytes = Math.ceil(requiredBits / 8);

    if (requiredBytes <= totalDataCapacity) {
      version = v;
      selectedSpec = spec;
      break;
    }
  }

  if (!selectedSpec) {
    throw new Error(`Texto demasiado largo para versión 10 QR: ${text.length} caracteres`);
  }

  const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = selectedSpec;
  const totalDataCapacity = g1Blocks * g1Data + g2Blocks * g2Data;

  const bitBuffer: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  // Modo Byte (0100)
  pushBits(0b0100, 4);
  const charCountBits = version < 10 ? 8 : 16;
  pushBits(dataLength, charCountBits);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminador
  const totalDataBits = totalDataCapacity * 8;
  const termBits = Math.min(4, totalDataBits - bitBuffer.length);
  for (let i = 0; i < termBits; i++) bitBuffer.push(0);
  while (bitBuffer.length % 8 !== 0) bitBuffer.push(0);

  // Bytes de relleno (Pad bytes)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuffer.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(totalDataCapacity);
  for (let i = 0; i < totalDataCapacity; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuffer[i * 8 + j];
    }
    dataCodewords[i] = b;
  }

  // Separar en bloques
  const totalBlocks = g1Blocks + g2Blocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let b = 0; b < g1Blocks; b++) {
    const slice = dataCodewords.slice(offset, offset + g1Data);
    dataBlocks.push(slice);
    ecBlocks.push(calculateRsErrorCorrection(slice, ecPerBlock));
    offset += g1Data;
  }
  for (let b = 0; b < g2Blocks; b++) {
    const slice = dataCodewords.slice(offset, offset + g2Data);
    dataBlocks.push(slice);
    ecBlocks.push(calculateRsErrorCorrection(slice, ecPerBlock));
    offset += g2Data;
  }

  // Interleaving
  const interleaved: number[] = [];
  const maxDataLen = Math.max(g1Data, g2Data);

  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < dataBlocks[b].length) {
        interleaved.push(dataBlocks[b][i]);
      }
    }
  }

  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      interleaved.push(ecBlocks[b][i]);
    }
  }

  const size = 17 + version * 4;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function placeFinder(top: number, left: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          const isBlack =
            r >= 0 &&
            r <= 6 &&
            c >= 0 &&
            c <= 6 &&
            (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          matrix[row][col] = isBlack;
          isFunction[row][col] = true;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (!isFunction[6][i]) {
      matrix[6][i] = val;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = val;
      isFunction[i][6] = true;
    }
  }

  // Alignment patterns
  const alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || [];
  for (const r of alignPos) {
    for (const c of alignPos) {
      if (
        (r === 6 && c === 6) ||
        (r === 6 && c === size - 7) ||
        (r === size - 7 && c === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const row = r + dr;
          const col = c + dc;
          const isBlack =
            Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          matrix[row][col] = isBlack;
          isFunction[row][col] = true;
        }
      }
    }
  }

  // Dark module
  matrix[4 * version + 9][8] = true;
  isFunction[4 * version + 9][8] = true;

  // Format info area reservation
  for (let i = 0; i <= 8; i++) {
    if (i < size) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isFunction[8][i] = true;
    isFunction[i][8] = true;
  }

  // Place data bits
  let bitIdx = 0;
  const allBits: number[] = [];
  for (const cw of interleaved) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--;
    const cols = [right, right - 1];

    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of cols) {
        if (!isFunction[row][col]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          matrix[row][col] = bit;
          bitIdx++;
        }
      }
    }
    upward = !upward;
    right -= 2;
  }

  // Evaluation of 8 standard masks
  const masks = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number) => r % 2 === 0,
    (_: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  let lowestPenalty = Infinity;
  let bestMatrix: boolean[][] = [];

  for (let m = 0; m < 8; m++) {
    const candidate: boolean[][] = matrix.map((row, r) =>
      row.map((val, c) => {
        if (isFunction[r][c]) return !!val;
        const invert = masks[m](r, c);
        return invert ? !val : !!val;
      }),
    );

    applyFormatInfo(candidate, ecLevel, m, size);

    const penalty = evaluatePenalty(candidate, size);
    if (penalty < lowestPenalty) {
      lowestPenalty = penalty;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

function applyFormatInfo(mat: boolean[][], ecLevel: EcLevel, mask: number, size: number) {
  const ecBitsMap: Record<EcLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
  const rawData = (ecBitsMap[ecLevel] << 3) | mask;

  let g = 0x537;
  let d = rawData << 10;
  for (let i = 4; i >= 0; i--) {
    if ((d >> (i + 10)) & 1) {
      d ^= g << i;
    }
  }
  const format = ((rawData << 10) | d) ^ 0x5412;

  for (let i = 0; i <= 5; i++) mat[8][i] = !!((format >> (14 - i)) & 1);
  mat[8][7] = !!((format >> 8) & 1);
  mat[8][8] = !!((format >> 7) & 1);
  mat[7][8] = !!((format >> 6) & 1);
  for (let i = 0; i <= 5; i++) mat[5 - i][8] = !!((format >> (5 - i)) & 1);

  for (let i = 0; i < 7; i++) mat[size - 1 - i][8] = !!((format >> (14 - i)) & 1);
  for (let i = 0; i < 8; i++) mat[8][size - 8 + i] = !!((format >> (7 - i)) & 1);
}

function evaluatePenalty(mat: boolean[][], size: number): number {
  let penalty = 0;
  for (let r = 0; r < size; r++) {
    let rowCount = 1;
    let colCount = 1;
    for (let c = 1; c < size; c++) {
      if (mat[r][c] === mat[r][c - 1]) {
        rowCount++;
        if (rowCount === 5) penalty += 3;
        else if (rowCount > 5) penalty += 1;
      } else rowCount = 1;

      if (mat[c][r] === mat[c - 1][r]) {
        colCount++;
        if (colCount === 5) penalty += 3;
        else if (colCount > 5) penalty += 1;
      } else colCount = 1;
    }
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = mat[r][c];
      if (v === mat[r + 1][c] && v === mat[r][c + 1] && v === mat[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

/**
 * Renderiza una matriz QR como string SVG vectorial nítido.
 */
export function renderSvg(
  matrix: boolean[][],
  {
    size = 512,
    margin = 4,
    darkColor = "#161310",
    lightColor = "#ffffff",
  }: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  } = {},
): string {
  const moduleCount = matrix.length;
  const totalModules = moduleCount + margin * 2;

  let pathData = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = c + margin;
        const y = r + margin;
        pathData += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}" shape-rendering="crispEdges">`,
    `  <rect width="100%" height="100%" fill="${lightColor}" />`,
    `  <path d="${pathData.trim()}" fill="${darkColor}" />`,
    `</svg>`,
  ].join("\n");
}

/**
 * Genera el SVG completo del código QR correspondiente al certificado.
 */
export function generateCertificateQrSvg(
  code: string,
  options?: QrSvgOptions,
): string {
  const url = getCertificateValidationUrl(code, options?.baseUrl);
  const matrix = encodeQrMatrix(url, "M");
  return renderSvg(matrix, options);
}

/**
 * Genera el QR como Data URL (SVG) para usar directamente en tags <img> o fondos CSS.
 */
export function generateCertificateQrSvgDataUrl(
  code: string,
  options?: QrSvgOptions,
): string {
  const svg = generateCertificateQrSvg(code, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

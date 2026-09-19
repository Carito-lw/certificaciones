#!/usr/bin/env node
/**
 * Script para generar los códigos QR de los certificados de Breakpoint Creativa.
 *
 * Guarda los archivos en:
 * generated/certificates/qrs/<CODIGO>.png
 * generated/certificates/qrs/<CODIGO>.svg
 *
 * Uso:
 * npm run certificates:qr
 * node scripts/generate-certificate-qrs.mjs [codigos...]
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeQrMatrix, renderSvg, renderPng } from "./qr-engine.mjs";

const ROOT_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT_DIR, "generated", "certificates", "qrs");

export const DEFAULT_PUBLIC_SITE_URL = "https://breakpointcreativa.com";

export function getCertificateValidationUrl(code, baseUrl) {
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
  const base = (baseUrl || process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL).replace(/\/+$/, "");
  return `${base}/verificar/${cleanCode}`;
}

const INITIAL_CODES = [
  "BPC-PYVC-2026-0001",
  "BPC-PYVC-2026-0002",
  "BPC-PYVC-2026-0003",
  "BPC-PYVC-2026-0004",
  "BPC-PYVC-2026-0005",
  "BPC-PYVC-2026-0006",
  "BPC-PYVC-2026-0007",
  "BPC-PYVC-2026-0008",
];

const cliArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const targetCodes = cliArgs.length > 0 ? cliArgs : INITIAL_CODES;

const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL).replace(/\/+$/, "");

console.log("=================================================");
console.log(" Breakpoint Creativa — Generador de QR");
console.log("=================================================");
console.log(`URL Base de validación: ${siteUrl}`);
console.log(`Directorio de salida:   ${OUTPUT_DIR}\n`);

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

let generatedCount = 0;

for (const rawCode of targetCodes) {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) continue;

  const url = getCertificateValidationUrl(code, siteUrl);
  const matrix = encodeQrMatrix(url, "M");

  const svgContent = renderSvg(matrix, {
    size: 1024,
    margin: 4,
    darkColor: "#161310",
    lightColor: "#ffffff",
  });

  const pngBuffer = renderPng(matrix, {
    size: 1024,
    margin: 4,
    darkColor: "#161310",
    lightColor: "#ffffff",
  });

  const pngPath = join(OUTPUT_DIR, `${code}.png`);
  const svgPath = join(OUTPUT_DIR, `${code}.svg`);

  writeFileSync(pngPath, Buffer.from(pngBuffer));
  writeFileSync(svgPath, svgContent, "utf-8");

  console.log(`✓ [${code}]`);
  console.log(`  URL: ${url}`);
  console.log(`  PNG: ${pngPath}`);
  console.log(`  SVG: ${svgPath}\n`);

  generatedCount++;
}

console.log("=================================================");
console.log(`Total generados con éxito: ${generatedCount} certificados.`);
console.log("=================================================");

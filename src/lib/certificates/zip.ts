import { deflateRawSync, crc32 } from "node:zlib";

export interface ZipEntry {
  filename: string;
  data: Buffer | Uint8Array;
}

/**
 * Generador de archivos ZIP estándar (PKZip 2.0 / DEFLATE) con librerías nativas de Node.js.
 * Cero dependencias externas. Totalmente reproducible y de alta velocidad.
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const localFileHeaders: Buffer[] = [];
  const centralDirectoryHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, "utf-8");
    const uncompressedData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const uncompressedSize = uncompressedData.length;
    const checksum = crc32(uncompressedData);

    const compressedData = deflateRawSync(uncompressedData);
    const compressedSize = compressedData.length;

    // Fecha/Hora DOS fija para reproducibilidad (2026-09-18 12:00:00)
    const dosTime = (12 << 11) | (0 << 5) | (0 >> 1);
    const dosDate = ((2026 - 1980) << 9) | (9 << 5) | 18;

    // 1. Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // firma local file header
    localHeader.writeUInt16LE(20, 4);         // versión mínima (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // flags (UTF-8)
    localHeader.writeUInt16LE(8, 8);          // compresión: DEFLATE (8)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);         // extra field length
    filenameBuffer.copy(localHeader, 30);

    localFileHeaders.push(localHeader);
    localFileHeaders.push(compressedData);

    // 2. Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // firma central directory
    centralHeader.writeUInt16LE(20, 4);         // versión hecha por
    centralHeader.writeUInt16LE(20, 6);         // versión mínima
    centralHeader.writeUInt16LE(0x0800, 8);     // flags (UTF-8)
    centralHeader.writeUInt16LE(8, 10);         // compresión: DEFLATE
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(filenameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);         // extra field length
    centralHeader.writeUInt16LE(0, 32);         // comment length
    centralHeader.writeUInt16LE(0, 34);         // disk number start
    centralHeader.writeUInt16LE(0, 36);         // internal file attributes
    centralHeader.writeUInt32LE(0x81a40000, 38);// external file attributes (-rw-r--r--)
    centralHeader.writeUInt32LE(offset, 42);    // relative offset of local header
    filenameBuffer.copy(centralHeader, 46);

    centralDirectoryHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectoryHeaders.reduce((sum, h) => sum + h.length, 0);

  // 3. End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // firma EOCD
  eocd.writeUInt16LE(0, 4);          // número de disco
  eocd.writeUInt16LE(0, 6);          // disco central directory
  eocd.writeUInt16LE(entries.length, 8);  // total entradas en este disco
  eocd.writeUInt16LE(entries.length, 10); // total entradas central directory
  eocd.writeUInt32LE(centralDirectorySize, 12);
  eocd.writeUInt32LE(centralDirectoryOffset, 16);
  eocd.writeUInt16LE(0, 20);         // longitud comentario

  return Buffer.concat([...localFileHeaders, ...centralDirectoryHeaders, eocd]);
}

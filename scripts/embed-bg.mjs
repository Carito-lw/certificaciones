import fs from 'node:fs';
import path from 'node:path';

const bgPath = path.resolve('public/certificate-assets/certificate-template-bg.png');
const b64 = fs.readFileSync(bgPath).toString('base64');
const outPath = path.resolve('src/lib/certificates/template-bg-base64.ts');

fs.writeFileSync(outPath, `// Generado automáticamente - fondo oficial del certificado en Base64
export const TEMPLATE_BG_BASE64 = "${b64}";
`);

console.log('Fondo Base64 generado exitosamente en:', outPath, 'Longitud:', b64.length);

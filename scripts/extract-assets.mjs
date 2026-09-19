import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const sourcePath = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc/Alejandro-Morales.png");
const sourceDataUri = `data:image/png;base64,${readFileSync(sourcePath).toString("base64")}`;

const publicSignaturesDir = resolve("public/signatures");
const publicAssetsDir = resolve("public/certificate-assets");
const artifactsDir = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc");

if (!existsSync(publicSignaturesDir)) mkdirSync(publicSignaturesDir, { recursive: true });
if (!existsSync(publicAssetsDir)) mkdirSync(publicAssetsDir, { recursive: true });

async function extract() {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:white;">
        <canvas id="c"></canvas>
      </body>
    </html>
  `);

  const result = await page.evaluate(async (dataUri) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUri;
    });

    const w = img.naturalWidth;
    const height = img.naturalHeight;

    // Helper to crop
    function crop(sx, sy, sw, sh, transparentBackground = false) {
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      if (transparentBackground) {
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i+1];
          const b = d[i+2];
          // If close to white / light gray paper background
          if (r > 230 && g > 230 && b > 230) {
            d[i+3] = 0; // transparent
          } else {
            // intensify ink contrast
            const darkness = 255 - Math.max(r, g, b);
            d[i] = 22; // #161310
            d[i+1] = 19;
            d[i+2] = 16;
            d[i+3] = Math.min(255, Math.round((darkness / 80) * 255));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      return canvas.toDataURL("image/png");
    }

    // In 1491 x 1055:
    // Carolina Riveros: x: 115..250 (w: 135), y: 742..851 (h: 109)
    // Gustavo Rojas: x: 450..625 (w: 175), y: 742..851 (h: 109)
    // Right graphic: x: 715..1491, y: 0..1055
    return {
      w,
      height,
      carolina: crop(115, 742, 140, 109, true),
      gustavo: crop(450, 742, 180, 109, true),
      rightGraphic: crop(715, 0, 776, 1055, false),
      fullBgWithoutDynamicText: crop(0, 0, w, height, false),
    };
  }, sourceDataUri);

  await browser.close();

  console.log("Image dimensions:", result.w, "x", result.height);

  function saveBase64(dataUri, filepath) {
    const base64 = dataUri.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(filepath, Buffer.from(base64, "base64"));
  }

  saveBase64(result.carolina, join(publicSignaturesDir, "firma-carolina-riveros.png"));
  saveBase64(result.gustavo, join(publicSignaturesDir, "firma-gustavo-rojas.png"));
  saveBase64(result.rightGraphic, join(publicAssetsDir, "certificate-right-graphic.png"));

  saveBase64(result.carolina, join(artifactsDir, "firma-carolina-riveros.png"));
  saveBase64(result.gustavo, join(artifactsDir, "firma-gustavo-rojas.png"));
  saveBase64(result.rightGraphic, join(artifactsDir, "certificate-right-graphic.png"));

  console.log("Assets extracted successfully!");
}

extract().catch(console.error);

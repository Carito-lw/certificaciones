import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc/Alejandro-Morales.png");
const sourceDataUri = `data:image/png;base64,${readFileSync(sourcePath).toString("base64")}`;

async function cleanGraphic() {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body></body></html>`);

  const cleanedDataUri = await page.evaluate(async (dataUri) => {
    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
      img.src = dataUri;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // 1. Clear text on left side with clean white/cream background
    // The diagonal slashes start at the bottom at x=380, and slope up to x=1050 at y=250.
    // Let's create a clipping path / polygon that covers all white paper area on the left:
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(890, 0);
    ctx.lineTo(890, 250);
    ctx.lineTo(760, 480);
    ctx.lineTo(580, 750);
    ctx.lineTo(380, 1055);
    ctx.lineTo(0, 1055);
    ctx.closePath();
    ctx.fill();

    // 2. Clean top-center: "IDEAS PERSONAS TECNOLOGÍA IMPACTO" (x: 880..1060, y: 0..170)
    ctx.fillRect(880, 0, 200, 170);

    // 3. Clean top-right: "N° DE CERTIFICADO BPC-PYVC-2026-0008" + orange line
    // Concrete from x: 1220..1480, y: 220..320 cloned to y: 35..135
    ctx.drawImage(img, 1220, 220, 260, 100, 1220, 35, 260, 100);

    // 4. Clean right text: "TECNOLOGÍA PARA IDEAS REALES." + orange line
    // Concrete from x: 1220..1480, y: 340..460 cloned to y: 590..710
    ctx.drawImage(img, 1220, 340, 260, 120, 1220, 590, 260, 120);

    // 5. Clean QR code and "VALIDÁ ESTE CERTIFICADO..." + orange line
    // Concrete part (y: 740..850) cloned from y: 410..520:
    ctx.drawImage(img, 1220, 410, 260, 110, 1220, 740, 260, 110);
    // Floor part (y: 850..960) cloned from y: 955..1055:
    ctx.drawImage(img, 1220, 955, 260, 100, 1220, 850, 260, 100);

    return canvas.toDataURL("image/png");
  }, sourceDataUri);

  await browser.close();

  const base64 = cleanedDataUri.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  writeFileSync(resolve("public/certificate-assets/certificate-clean-bg.png"), buf);
  writeFileSync(resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc/certificate-clean-bg.png"), buf);

  console.log("Clean background generated successfully!");
}

cleanGraphic().catch(console.error);

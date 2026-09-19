import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc/Alejandro-Morales.png");
const sourceDataUri = `data:image/png;base64,${readFileSync(sourcePath).toString("base64")}`;

async function makeTemplateBg() {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body></body></html>`);

  const templateBgDataUri = await page.evaluate(async (dataUri) => {
    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
      img.src = dataUri;
    });

    const w = img.naturalWidth; // 1491
    const h = img.naturalHeight; // 1055

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const bgPaper = "#FEFEFB";

    // 1. Clear body text from y: 240 down to y: 735
    ctx.fillStyle = bgPaper;
    // Main body block covering from x: 70 to 650, y: 240 to 735
    ctx.fillRect(70, 240, 580, 495);
    // Upper body extension (name and long course name) up to x: 790
    ctx.fillRect(650, 240, 140, 340);

    // 2. Clear top-right code between "N° DE CERTIFICADO" and the orange line:
    // (x: 1220..1460, y: 64..90)
    ctx.drawImage(img, 1220, 115, 240, 26, 1220, 64, 240, 26);

    // 3. Clear QR code box cleanly over its exact coordinates
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(1250, 755, 175, 165);

    return canvas.toDataURL("image/png");
  }, sourceDataUri);

  await browser.close();

  const base64 = templateBgDataUri.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  writeFileSync(resolve("public/certificate-assets/certificate-template-bg.png"), buf);
  writeFileSync(resolve("C:/Users/PC/.gemini/antigravity-ide/brain/dd549024-a6ca-48a3-b962-da20b47c60cc/certificate-template-bg.png"), buf);

  console.log("Template background created successfully!");
}

makeTemplateBg().catch(console.error);

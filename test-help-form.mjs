import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5175";
const OUT = "test-help-form";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function shot(name, wait = 0) {
  await page.waitForTimeout(350 + wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}`);
}

// Boot
console.log("▶ Boot");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator('[class*="submitBtn"]').click();
await page.waitForTimeout(3600);

// Profil → Yardım
console.log("▶ Yardım sayfası");
await page.locator("nav a").nth(3).click();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await page.locator("text=Yardım").click();
await shot("01-yardim-form-bos");

// Scroll to form
await page.evaluate(() => window.scrollTo(0, 400));
await shot("02-yardim-form-gorunum", 100);

// Formu doldur
await page.locator('[id="help-name"]').fill("Sarp Yıldırım");
await page.locator('[id="help-email"]').fill("sarp@ornek.com");
await page.locator('[id="help-konu"]').selectOption("Teknik Sorun");
await page.locator('[id="help-mesaj"]').fill("Uygulamayı açtığımda bildirimler gelmiyor, yardımcı olabilir misiniz?");
await shot("03-yardim-form-dolu", 200);

// Gönder
await page.locator('[class*="sendBtn"]').click();
await shot("04-yardim-form-gonderildi", 400);

// Toast görünür mü?
await page.evaluate(() => window.scrollTo(0, 600));
await shot("05-yardim-toast-gorunu", 100);

// 4 saniye sonra toast kaybolmalı
await page.waitForTimeout(4200);
await shot("06-yardim-toast-kayboldu");

// Diğer İletişim bölümü
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("07-yardim-diger-iletisim", 100);

await browser.close();
console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5174";
const OUT = "test-screenshots3";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function shot(name, extraWait = 0) {
  await page.waitForTimeout(500 + extraWait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}`);
}

// 1. Ana feed — splash geçtikten sonra
console.log("▶ Ana sayfa");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3400); // splash geçsin
await shot("01-feed-ust");

// 2. Canlı Oturum bandı yakın
await page.evaluate(() => window.scrollTo(0, 0));
await shot("02-canli-oturum-bandi");

// 3. Canlı Oturum modalı
const banner = page.locator('[class*="banner"]').first();
await banner.click();
await shot("03-canli-modal");

// Katıl
const joinBtn = page.locator('[class*="joinFullBtn"]').first();
await joinBtn.click();
await shot("04-canli-katilindi");

// kapat
const closeBtn = page.locator('[class*="closeBtn"]').first();
await closeBtn.click();
await page.waitForTimeout(300);

// 4. Feed kartı — aksiyon butonları
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await shot("05-kart-aksiyon-butonlari");

// 5. Rafıma Al tıkla
const actionBtns = page.locator('[class*="actionBtn"]');
await actionBtns.nth(0).click(); // Rafıma Al
await shot("06-rafima-al-aktif", 200);

// 6. Yer İmi
await actionBtns.nth(1).click();
await shot("07-yer-imi-aktif", 200);

// 7. Bağlantı Talep Et
await actionBtns.nth(2).click();
await shot("08-baglanti-talep-toast", 200);

// 8. Yorum butonu — inline yorumlar aç
await actionBtns.nth(3).click();
await shot("09-yorum-acik");

// Yorum yaz
const inp = page.locator('[class*="commentInput"]').first();
await inp.fill("Harika bir hikaye!");
await page.locator('[class*="commentSend"]').first().click();
await shot("10-yorum-gonderildi", 300);

// 9. Sayfayı aşağı kaydır — daha fazla kart
await page.evaluate(() => window.scrollTo(0, 600));
await shot("11-feed-ikinci-kart");

// 10. Gündem bölümü
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 900));
await shot("12-gundem");

await browser.close();

console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5174";
const OUT = "test-screenshots5";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function shot(name, extraWait = 0) {
  await page.waitForTimeout(400 + extraWait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}`);
}

// 1. Auth - Giriş ekranı
console.log("▶ Auth ekranı");
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("01-auth-login");

// Kayıt Ol sekmesi
const modeBtns = page.locator('[class*="modeBtn"]');
await modeBtns.nth(1).click();
await shot("02-auth-register", 200);

// Form doldur ve giriş yap
await modeBtns.nth(0).click();
await page.locator('input[type="email"]').fill("test@example.com");
await page.locator('input[type="password"]').fill("sifre123");
await shot("03-auth-filled", 200);

// Submit
await page.locator('[class*="submitBtn"]').click();

// 2. Splash ekranı - gold slogan
console.log("▶ Splash ekranı");
await page.waitForTimeout(600);
await shot("04-splash-gold", 200);
await page.waitForTimeout(3000); // splash biter

// 3. Keşfet sayfası - dark theme
console.log("▶ Keşfet - dark theme");
await shot("05-kesfet-dark");

// 4. Feed kartları
await page.evaluate(() => window.scrollTo(0, 100));
await shot("06-feed-kartlari");

// 5. Bağlan sayfası
console.log("▶ Bağlan - dark theme");
await page.locator("nav a").nth(1).click();
await shot("07-baglan-dark");

// 6. Profil sayfası
console.log("▶ Profil - dark theme");
await page.locator("nav a").nth(3).click();
await shot("08-profil-dark");

// 7. Hikayem sekmesi
await page.locator('[class*="tabBar"] button').nth(1).click();
await shot("09-hikayem-dark", 200);

// 8. Hikaye detay sayfası
console.log("▶ Hikaye detay - dark theme");
await page.locator("nav a").nth(0).click();
await page.waitForTimeout(300);
await page.locator('[class*="coverLink"]').first().click();
await shot("10-hikaye-detay-dark", 300);

// Auth Google butonu
console.log("▶ Google auth button");
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("11-auth-google-btn");

await browser.close();

console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

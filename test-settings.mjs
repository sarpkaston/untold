import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5174";
const OUT = "test-screenshots6";
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

// Boot: Auth → Splash → App
console.log("▶ Giriş → Splash → Uygulama");
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("01-auth-terracotta");
await page.locator('[class*="submitBtn"]').click();
await page.waitForTimeout(600);
await shot("02-splash-terracotta");
await page.waitForTimeout(3000);
await shot("03-kesfet-terracotta");

// Navigate to Profil → Ayarlar
console.log("▶ Profil ayarlar");
await page.locator("nav a").nth(3).click();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("04-profil-ayarlar", 200);

// Bildirimler
console.log("▶ Bildirimler");
await page.locator("text=Bildirimler").first().click();
await shot("05-bildirimler");

// Toggle kapatma
const toggles = page.locator('[class*="toggle"]');
await toggles.nth(0).click();
await shot("06-bildirimler-toggle-kapali", 200);
await toggles.nth(0).click();
await shot("07-bildirimler-toggle-acik", 200);

// Gizlilik
await page.goBack();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.locator("text=Gizlilik").click();
await shot("08-gizlilik");

// Görünürlük değiştir
await page.locator('[class*="radioRow"]').nth(1).click();
await shot("09-gizlilik-baglantilar", 200);

// Üçüncü taraf toggle
await page.locator('button[class*="toggle"]').click();
await shot("10-gizlilik-toggle", 200);

// Veri silme talebi
await page.locator('[class*="deleteBtn"]').click();
await shot("11-gizlilik-delete-confirm", 200);
await page.locator('[class*="modalCancel"]').click();

// Şifre değiştir
await page.goBack();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.locator("text=Şifre Değiştir").click();
await shot("12-sifre-degistir");

// Form doldur
await page.locator('input').nth(0).fill("eskisifre123");
await page.locator('input').nth(1).fill("Yeni@Sifre2026");
await page.locator('input').nth(2).fill("Yeni@Sifre2026");
await shot("13-sifre-form-dolu", 200);
await page.locator('[class*="submitBtn"]').click();
await shot("14-sifre-basarili", 200);

// Yardım
await page.goBack();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.locator("text=Yardım").click();
await shot("15-yardim");
await page.locator('[class*="question"]').nth(0).click();
await shot("16-yardim-sss-acik", 200);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("17-yardim-iletisim");

// Kullanım Koşulları
await page.goBack();
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.locator("text=Kullanım Koşulları").click();
await shot("18-kullanim-kosullari");
await page.locator('[class*="tab"]').nth(1).click();
await shot("19-gizlilik-politikasi", 200);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("20-gizlilik-politikasi-alt");

await browser.close();
console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

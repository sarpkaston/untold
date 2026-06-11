import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5174";
const OUT = "test-screenshots4";
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

// BottomNav links are <a> tags inside <nav>
// indexes: 0=Keşfet 1=Bağlan 2=Hikayem 3=Profil
async function goNav(index) {
  await page.locator("nav a").nth(index).click();
  await page.waitForTimeout(250);
}

// 1. Load and wait for splash
console.log("▶ Açılış — splash geçişi bekleniyor");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3400);
await shot("01-kesfet");

// 2. Bağlan sayfası
console.log("▶ Bağlan sayfası");
await goNav(1);
await shot("02-baglan-su-an-canli");

await page.evaluate(() => window.scrollTo(0, 400));
await shot("03-baglan-yakinda");

await page.evaluate(() => window.scrollTo(0, 800));
await shot("04-baglan-sana-ozel");

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("05-baglan-gundemde");

// Scroll back and click Katıl
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const katilBtn = page.locator('[class*="joinBtn"]').first();
await katilBtn.click();
await shot("06-baglan-katilindi", 200);

// Hatırlatıcı butonu
const remindBtn = page.locator('[class*="remindBtn"]').first();
await remindBtn.click();
await shot("07-baglan-hatirlatici-aktif", 200);

// 3. Profil sayfası — Rafım tab (boş başlangıç)
console.log("▶ Profil sayfası");
await goNav(3);
await shot("08-profil-rafim-bos");

// Hikayem sekmesi — profile page tabs (inside [class*="tabBar"])
const profileTabs = page.locator('[class*="tabBar"] button');
await profileTabs.nth(1).click();
await shot("09-profil-hikayem", 200);

// Bağlantılarım sekmesi (boş)
await profileTabs.nth(2).click();
await shot("10-profil-baglantilarim-bos", 200);

// 4. Rafıma Al → Profil Rafım dolsun
console.log("▶ Rafıma Al → Profil Rafım");
await goNav(0);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
// First card's action buttons
const actionBtns = page.locator('[class*="actionBtn"]');
await actionBtns.nth(0).click(); // Rafıma Al
await shot("11-rafima-al-tiklandi", 300);

// Profil → Rafım sekmesi dolu mu?
await goNav(3);
const profileTabs2 = page.locator('[class*="tabBar"] button');
await profileTabs2.nth(0).click();
await shot("12-profil-rafim-dolu", 200);

// 5. Bağlantı talep → Bağlantılarım
await goNav(0);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const actionBtns2 = page.locator('[class*="actionBtn"]');
await actionBtns2.nth(2).click(); // Bağlantı talep
await shot("13-baglanti-talep", 300);

await goNav(3);
const profileTabs3 = page.locator('[class*="tabBar"] button');
await profileTabs3.nth(2).click();
await shot("14-profil-baglantilarim-dolu", 300);

// 6. Ayarlar bölümü
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await shot("15-profil-ayarlar");

await browser.close();

console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

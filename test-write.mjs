import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:5175";
const OUT = "test-write";
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
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator('[class*="submitBtn"]').click();
await page.waitForTimeout(3600);

// Profil → Hikayem tab (2. tab butonu) → Yeni Hikaye Yaz linki
console.log("▶ Yaz sayfası");
await page.locator("nav a").nth(3).click();
await shot("01-profil");
// tabBar'daki 2. buton = Hikayem (stats "Hikayem" span'ından farklı)
await page.locator('[class*="tabBar"] button').nth(1).click();
await page.waitForTimeout(300);
await page.locator('a[href="/yaz"]').click();
await shot("02-yaz-adim1");

// Adım 1: boş iken "Devam Et" disabled mı?
const nextBtn = page.locator('[class*="nextBtn"]');
const isDisabled = await nextBtn.getAttribute("disabled");
console.log("  Adım 1 buton disabled (boş form):", isDisabled !== null ? "✓" : "✗ (aktif olmamalı)");

// Adım 1: Doldur
await page.locator('input').nth(0).fill("Annemin Elleri");
await page.locator('input').nth(1).fill("Bir anının sıcaklığı");
await page.locator('[class*="catOption"]').nth(0).click();
await shot("03-yaz-adim1-dolu", 200);

// Adım 1 → Adım 2
await page.locator('[class*="nextBtn"]').click();
await shot("04-yaz-adim2-bos");

// Adım 2: "İleri" butonu boş iken disabled mı?
const step2next = page.locator('[class*="nextBtn"]');
const step2disabled = await step2next.getAttribute("disabled");
console.log("  Adım 2 buton disabled (boş içerik):", step2disabled !== null ? "✓" : "✗");

// Metin alanı görünürlüğünü kontrol et
const editor = page.locator('textarea[class*="editor"]');
const editorBox = await editor.boundingBox();
console.log("  Editor boyutu:", editorBox ? `${Math.round(editorBox.width)}x${Math.round(editorBox.height)}` : "bulunamadı");

// Adım 2: Metin yaz
await page.locator('textarea[class*="editor"]').fill("Annemin elleri her zaman ılıktı. Sabah kahvaltısında ekmek keserken, akşam yemeğinde tencereyi karıştırırken, beni okşarken hep aynı sıcaklıktaydı. O eller yıllar geçtikçe pürüzlendi, yoruldu, ama hiç soğumadı.");
await shot("05-yaz-adim2-dolu", 200);

// Adım 2 → Adım 3
await page.locator('[class*="nextBtn"]').click();
await shot("06-yaz-adim3-onizleme");

// Adım 3: geri gidip tekrar ileri
await page.locator("text=← Düzenle").click();
await shot("07-yaz-adim2-geri-dondu", 200);
await page.locator('[class*="nextBtn"]').click();
await shot("08-yaz-adim3-tekrar", 200);

// Adım göstergelerini kontrol et
const steps = page.locator('[class*="step"]');
const stepCount = await steps.count();
console.log("  Adım sayısı:", stepCount);

await browser.close();
console.log("\n=== HATALAR ===");
if (errors.length === 0) console.log("  Hiç hata yok ✓");
else errors.forEach((e) => console.log("  ✗", e));

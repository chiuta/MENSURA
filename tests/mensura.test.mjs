// MENSURA — teste proprii (kit FFF 1.6.0): pornire, date vechi din localStorage, dialoguri ale kitului în locul celor native,
// copie de siguranță, accesibilitate (axe), 8 limbi fără depășiri, import ostil.
// Rulare: node tests/mensura.test.mjs
//   Playwright: din NODE_PATH / PW_ROOT; Chromium: CHROMIUM_PATH; axe-core: FFF_AXE / AXE_PATH sau pachetul `axe-core`.
//   Rețeaua e blocată; datele sunt fixe (nu depind de data de azi).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const APP = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'app.json'), 'utf8'));
const HTML = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
const require = createRequire(process.env.PW_ROOT || import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { console.error('lipsește `playwright` (npm i -D playwright, sau NODE_PATH / PW_ROOT)'); process.exit(2); }
const AXE = process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return createRequire(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return null; } })();
if (!AXE || !fs.existsSync(AXE)) { console.error('lipsește axe-core (FFF_AXE=<cale>/axe.min.js sau npm i -D axe-core)'); process.exit(2); }
const axeSrc = fs.readFileSync(AXE, 'utf8');

let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : '')); } };

// datele unui utilizator „vechi” (formatul MENSURA 1.5, cheia mensura.v1, neschimbată de kit)
const OLD = {lang: 'de', theme: 'light', results: {span: {raw: 7, det: {s: 7}, date: 1760000000000}}, hist: [{id: 'span', raw: 6, det: {s: 6}, date: 1750000000000}, {id: 'span', raw: 7, det: {s: 7}, date: 1760000000000}], acc: true, cal: {span: {n: 3, m: 5, sd: 1.1}}};
const OLD_RAW = JSON.stringify(OLD);

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open({w = 1280, h = 800, scheme = 'dark', seed = null, ls = null} = {}) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: scheme, locale: 'en-US', reducedMotion: 'reduce'});
  const net = [];
  await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  const errs = [], native = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  page.on('dialog', (d) => { native.push(d.type() + ': ' + d.message()); d.dismiss(); });
  if (seed !== null || ls) await page.addInitScript(([s, extra]) => {
    try {
      if (s !== null && localStorage.getItem('mensura.v1') === null && !sessionStorage.getItem('__seeded')) { localStorage.setItem('mensura.v1', s); sessionStorage.setItem('__seeded', '1'); }
      if (extra) for (const k in extra) if (localStorage.getItem(k) === null && !sessionStorage.getItem('__seeded_' + k)) { localStorage.setItem(k, extra[k]); sessionStorage.setItem('__seeded_' + k, '1'); }
    } catch (e) { /* ignorat */ }
  }, [seed, ls]);
  await page.goto(FILE);
  await page.waitForSelector('#app .hero');
  await page.waitForTimeout(400);
  return {ctx, page, errs, net, native};
}
const lsGet = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const dlgOpen = (page) => page.evaluate(() => !!document.querySelector('dialog.fff-dlg[open]'));
async function dlgClick(page, which) {   // 0 = Anulează, 1 = confirmă
  await page.waitForSelector('dialog.fff-dlg[open]');
  await page.evaluate((i) => { const b = document.querySelectorAll('dialog.fff-dlg[open] button.fff-btn'); b[i].click(); }, which);
  await page.waitForTimeout(250);
}

/* 1. Pornire ------------------------------------------------------------- */
console.log('1. pornire');
{
  const {ctx, page, errs, net, native} = await open();
  check('zero erori JS / CSP', errs.length === 0, errs);
  check('nicio cerere de rețea', net.length === 0, net);
  const csp = (HTML.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i) || [])[1] || '';
  const inline = [...HTML.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)].filter((m) => !/type="application\/(json|ld\+json)"/i.test(m[1])).length;
  const hashes = (csp.match(/'sha256-/g) || []).length;
  check('CSP: connect-src \'none\', fără unsafe-inline/unsafe-eval la scripturi', /connect-src 'none'/.test(csp) && !/script-src[^;]*'unsafe-(inline|eval)'/.test(csp), csp.slice(0, 120));
  check('CSP: hash-uri ≥ scripturi inline', hashes >= inline && hashes > 0, {hashes, inline});
  const v = await page.evaluate(() => ({meta: document.querySelector('meta[name=application-version]').content, lbl: document.getElementById('app-version').textContent, pill: document.querySelector('.vpill').textContent, ver: VERSION, role: document.getElementById('app-version').getAttribute('role'), ret: document.getElementById('app-version').isConnected}));
  check('versiunea afișată = app.json', v.meta === APP.version && v.ver === APP.version && v.lbl.includes(APP.version) && v.pill.includes(APP.version), {v, app: APP.version});
  check('eticheta „Transparență” e buton și rămâne după re-randare', v.role === 'button' && v.ret);
  await page.selectOption('.bar select', 'fr'); await page.waitForTimeout(300);
  const again = await page.evaluate(() => { const e = document.getElementById('app-version'); return [e && e.getAttribute('role'), document.querySelectorAll('#app-version').length, e && e.textContent]; });
  check('după schimbarea limbii: un singur #app-version, tot buton, text tradus', again[0] === 'button' && again[1] === 1 && /Version|Mise à jour/.test(again[2]), again);
  await page.click('#app-version'); await page.waitForSelector('dialog.fff-dlg[open]');
  const t = await page.evaluate(() => document.querySelector('dialog.fff-dlg[open]').textContent);
  check('dialogul Transparență: 0 cereri externe, cheia mensura.v1 listată', /mensura/.test(t) && /0/.test(t), t.slice(0, 160));
  check('fără dialoguri native', native.length === 0, native);
  await ctx.close();
}

/* 2. Date vechi: păstrate intacte, fără migrare de chei -------------------- */
console.log('2. date vechi (mensura.v1)');
{
  const {ctx, page, errs, native} = await open({seed: OLD_RAW});
  check('limba și tema vechi aplicate', await page.evaluate(() => [document.documentElement.lang, document.documentElement.getAttribute('data-theme')].join()) === 'de,light');
  check('cheia veche nu e atinsă la pornire (octet cu octet)', (await lsGet(page, 'mensura.v1')) === OLD_RAW);
  check('nicio cheie nouă concurentă: aceeași cheie, fără „mensura_*”', await page.evaluate(() => Object.keys(localStorage).filter((k) => /^mensura/i.test(k)).join()) === 'mensura.v1');
  const st = await page.evaluate(() => ({h: S.hist.length, r: Object.keys(S.results).join(), acc: S.acc, cal: S.cal}));
  check('S încărcat complet (istoric 2, rezultat span, acc, calibrare)', st.h === 2 && st.r === 'span' && st.acc === true && st.cal.span.n === 3, st);
  await page.click('#tab-r'); await page.waitForTimeout(200);
  const body = await page.evaluate(() => document.getElementById('panel').textContent);
  check('rezultatul vechi apare în tabul Rezultate', /\b7\b/.test(body), body.slice(0, 200));

  // înlocuirea confirm() nativ: dialogul kitului, „Anulează” păstrează datele, „Da” șterge doar rezultatele
  await page.evaluate(() => { [...document.querySelectorAll('#panel button')].find((b) => b.textContent === t('r_reset')).click(); });
  check('„Șterge datele”: dialog al kitului deschis', await dlgOpen(page));
  const info = await page.evaluate(() => { const d = document.querySelector('dialog.fff-dlg[open]'); return {modal: d.getAttribute('aria-modal'), role: d.getAttribute('role'), msg: d.textContent.includes(t('r_confirm'))}; });
  check('dialog accesibil (role, aria-modal) cu mesajul tradus', info.modal === 'true' && info.role === 'dialog' && info.msg, info);
  await dlgClick(page, 0);
  check('„Anulează” nu șterge nimic', (await lsGet(page, 'mensura.v1')) === OLD_RAW && !(await dlgOpen(page)));
  await page.evaluate(() => { [...document.querySelectorAll('#panel button')].find((b) => b.textContent === t('r_reset')).click(); });
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  check('Escape = anulare', (await lsGet(page, 'mensura.v1')) === OLD_RAW && !(await dlgOpen(page)));
  await page.evaluate(() => { [...document.querySelectorAll('#panel button')].find((b) => b.textContent === t('r_reset')).click(); });
  await dlgClick(page, 1);
  const after = JSON.parse(await lsGet(page, 'mensura.v1'));
  check('„Da” șterge rezultatele și istoricul, păstrează limba, tema, accesibilitatea, calibrarea',
    Object.keys(after.results).length === 0 && after.hist.length === 0 && after.lang === 'de' && after.theme === 'light' && after.acc === true && after.cal.span.n === 3, after);
  check('zero erori JS, fără dialoguri native', errs.length === 0 && native.length === 0, {errs, native});
  await ctx.close();
}

/* 3. Copie de siguranță a kitului (export → ștergere → import) ------------- */
console.log('3. copie de siguranță .fff.json');
{
  const {ctx, page, errs} = await open({seed: OLD_RAW});
  const bundle = await page.evaluate(async () => {
    const b = FFF.bundle.build();
    return {keys: Object.keys(b.data || {}), v: b.data && b.data['mensura.v1']};
  });
  check('copia include mensura.v1 cu valoarea exactă', bundle.keys.includes('mensura.v1') && bundle.v === OLD_RAW, bundle.keys);
  const rt = await page.evaluate(async (raw) => {
    const env = FFF.bundle.build();
    localStorage.setItem('mensura.v1', '{"lang":"en","theme":"dark","results":{},"hist":[]}');   // starea „după” o ștergere
    const file = new File([JSON.stringify(env)], 'b.fff.json', {type: 'application/json'});
    const r = await FFF.bundle.import(file, {confirm: false, reload: false});
    return {restored: localStorage.getItem('mensura.v1') === raw, r: r && (r.keys || r.count || Object.keys(r))};
  }, OLD_RAW);
  check('import copie: valoarea originală revine identic', rt.restored, rt);
  check('zero erori', errs.length === 0, errs);
  await ctx.close();
}

/* 4. Accesibilitate: axe în ambele teme, 360 și 1366, pagina, tabul Rezultate și dialogurile */
console.log('4. axe-core');
for (const scheme of ['light', 'dark']) for (const [w, h] of [[1366, 800], [360, 740]]) {
  const {ctx, page} = await open({w, h, scheme, seed: OLD_RAW});
  await page.evaluate(axeSrc + '\n;0');
  const run = async (label, sel) => {
    const v = await page.evaluate(async (s) => (await axe.run(s ? document.querySelector(s) : document, {resultTypes: ['violations']})).violations.map((x) => x.id + ': ' + x.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')), sel);
    check(`axe ${scheme} ${w}px · ${label}`, v.length === 0, v);
  };
  await run('Teste', null);
  for (const tab of ['r', 'a', 'm']) { await page.click('#tab-' + tab); await page.waitForTimeout(150); await run('tab ' + tab, null); }
  await page.evaluate(() => { [...document.querySelectorAll('#panel button')].find((b) => b.textContent === t('r_reset')) ; });
  await page.click('#tab-r'); await page.evaluate(() => { [...document.querySelectorAll('#panel button')].find((b) => b.textContent === t('r_reset')).click(); });
  await page.waitForSelector('dialog.fff-dlg[open]'); await run('dialog confirmare', 'dialog[open]'); await page.keyboard.press('Escape');
  await page.click('#app-version'); await page.waitForSelector('dialog.fff-dlg[open]'); await run('dialog Transparență', 'dialog[open]');
  await ctx.close();
}

/* 5. Opt limbi: paritate de chei, fără chei brute, fără depășire orizontală */
console.log('5. 8 limbi');
{
  const {ctx, page, errs} = await open({w: 360, h: 740});
  const par = await page.evaluate(() => { const en = Object.keys(I18N.en); const out = {}; for (const l of Object.keys(I18N)) { const ks = Object.keys(I18N[l]); out[l] = {missing: en.filter((k) => !(k in I18N[l])).length, extra: ks.filter((k) => !(k in I18N.en)).length, empty: ks.filter((k) => I18N[l][k] === '').length}; } return {langs: Object.keys(I18N), out}; });
  check('exact 8 limbi', par.langs.slice().sort().join() === 'de,en,es,fr,hu,it,pt,ro', par.langs);
  check('nicio cheie lipsă / în plus / goală', Object.values(par.out).every((o) => o.missing === 0 && o.extra === 0 && o.empty === 0), par.out);
  for (const l of par.langs) {
    await page.selectOption('.bar select', l); await page.waitForTimeout(150);
    const bad = [];
    for (const tab of ['t', 'r', 'a', 'n', 'm', 'i']) {
      await page.click('#tab-' + tab); await page.waitForTimeout(80);
      const r = await page.evaluate(() => ({ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, raw: [...document.querySelectorAll('#app h1,#app h2,#app h3,#app .tab,#app button,#app p')].map((e) => e.textContent.trim()).filter((s) => /^[a-z]{1,3}_[a-z0-9_]+$/.test(s) || /\bundefined\b/.test(s)).slice(0, 3)}));
      if (r.ov > 1) bad.push(`${tab}: depășire ${r.ov}px`);
      if (r.raw.length) bad.push(`${tab}: chei brute ${r.raw}`);
    }
    check(`limba ${l}: 6 taburi la 360 px fără depășire și fără chei brute`, bad.length === 0, bad);
  }
  check('zero erori JS', errs.length === 0, errs);
  await ctx.close();
}

/* 6. Import ostil: fișiere corupte / goale / uriașe nu strică starea -------- */
console.log('6. import ostil');
{
  const {ctx, page, errs, native} = await open({seed: OLD_RAW});
  await page.click('#tab-r'); await page.waitForTimeout(200);
  const sel = 'input[type=file][aria-label="' + (await page.evaluate(() => t('r_restore'))) + '"]';
  const snapshot = () => lsGet(page, 'mensura.v1');
  const before = await snapshot();
  const hostile = {
    gol: '',
    nejson: 'nu e json {{{',
    obiect_gol: '{}',
    alta_aplicatie: JSON.stringify({app: 'ALTCEVA', history: [{id: 'span', raw: 9, det: {s: 9}, date: 1}]}),
    id_otravit: JSON.stringify({app: 'MENSURA', history: [{id: '__proto__', raw: 1, det: {c: 1, n: 2}, date: 5}, {id: 'constructor', raw: 1, det: {}, date: 6}], results: {'__proto__': {raw: 1, det: {s: 1}, date: 7}}}),
    valori_nenumerice: JSON.stringify({app: 'MENSURA', history: [{id: 'span', raw: 'x', det: {s: 9}, date: 1}, {id: 'span', raw: 1e999, det: {s: 1}, date: 2}, {id: 'span', raw: 5, det: null, date: 3}]}),
    uriaș: '{"app":"MENSURA","history":[],"pad":"' + 'a'.repeat(12 * 1024 * 1024) + '"}',
  };
  for (const [name, content] of Object.entries(hostile)) {
    await page.setInputFiles(sel, {name: name + '.json', mimeType: 'application/json', buffer: Buffer.from(content)});
    await page.waitForTimeout(350);
    const hist = await page.evaluate(() => S.hist.length);
    check(`import ${name}: istoricul rămâne 2 și pagina funcționează`, hist === 2 && (await page.evaluate(() => !!document.getElementById('panel'))), hist);
  }
  check('cheia mensura.v1 neschimbată după importurile ostile', (await snapshot()) === before);
  check('prototipul global neatins', await page.evaluate(() => ({}).raw === undefined && Object.prototype.det === undefined && ({}).s === undefined));
  // importul kitului: fișier corupt → eroare tradusă, nimic scris
  const rb = await page.evaluate(async () => {
    const out = {};
    for (const [n, c] of [['gol', ''], ['nejson', 'zzz'], ['alt-format', '{"fff":9}'], ['alta-app', JSON.stringify({fff: 1, app: 'altceva', data: {x: '1'}})]]) {
      try { await FFF.bundle.import(new File([c], n + '.fff.json'), {confirm: false, reload: false}); out[n] = 'acceptat'; } catch (e) { out[n] = e.code || 'eroare'; }
    }
    return out;
  });
  check('import kit ostil respins cu cod de eroare', Object.values(rb).every((v) => v !== 'acceptat'), rb);
  check('mensura.v1 tot neschimbat', (await snapshot()) === before);
  check('zero erori JS, fără dialoguri native', errs.length === 0 && native.length === 0, {errs, native});
  await ctx.close();
}

await browser.close();
console.log(`\n${ok} ok, ${bad} eșuate`);
process.exit(bad ? 1 : 0);

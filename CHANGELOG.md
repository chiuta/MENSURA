# Jurnal de modificări — MENSURA

Format: SemVer MAJOR.MINOR.PATCH. Date: AAAA-LL-ZZ.

## 1.6.0 — 2026-11-03

Aducere la nivelul celorlalte aplicații „fără frontiere”:

- Nou (kit FFF 1.2.0: `core, store, dialog, label, bundle, qr, p2p, sync, history, bridge`): dialogul «Transparență» (clic pe versiune: rețea, stocare, permisiuni, SHA-256), copie de siguranță `.fff.json` (și criptată), sincronizare între dispozitive și istoric local; CSP strict (`connect-src 'none'`, scripturi doar cu hash); instalabilă (manifest + service worker, offline).
- Schimbat: `confirm()` nativ de la «Șterge datele» este înlocuit cu dialogul accesibil al kitului (Escape = anulare, focus pe «Anulează»).
- **Date existente: neschimbate.** Cheia de stocare `mensura.v1` avea deja prefixul aplicației, deci nu s-a mutat nimic și nu s-a șters nimic; testul `tests/mensura.test.mjs` pornește cu date din 1.5 și verifică octet cu octet că rămân intacte la pornire, la anularea ștergerii și la importuri ostile.
- Accesibilitate: puncte de reper (antet, `main`, subsol) în loc de `main role=tabpanel`; tablist/tabpanel legate prin `aria-controls`/`aria-labelledby`; banda de cifre derulabilă pe telefon e focalizabilă și etichetată (cheie nouă `aria_stats`, 8 limbi); tabul Atlas are titlu `h2` (ordinea titlurilor). axe-core: 0 violări în 8 scenarii (luminos/întunecat, 360/1366 px, pagină și dialog).
- Teste noi: `tests/mensura.test.mjs` (pornire fără erori/rețea/CSP, date vechi, dialoguri ale kitului, copie de siguranță, axe pe patru taburi și dialoguri, paritate pe 8 limbi și fără depășiri la 360 px, import ostil).
- `MENSURA.html` (copie identică a lui `index.html`) devine o pagină de redirecționare către `index.html`, ca să nu rămână o a doua versiune în urmă.

## 1.5 — 2026-11-03

Pașaport de învățare comun (`passport/fff`): «Notează în pașaport», repetiție eșalonată, certificat tipăribil.

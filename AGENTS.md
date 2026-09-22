<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## ⚠ Backend kontrakti va ish ro'yxati — BIRINCHI SHUNI O'QING

Backend (`../Backend`, `esharqhq/Germany-ERP`) — yagona haqiqat manbai, va u tez o'zgaradi.
Shu repo uchun ochiq ish ro'yxati: **`../assets/docs/admin-panel-tasks.md`**
(indeks va qoidalar: `../assets/docs/README.md`).

Kontraktning o'zi: `../Backend/docs/handoff/` — avval `git pull`.
Ustunlik: **jonli javob > guide > bu hujjatlar.**
⚠ **Ledger: `BACKEND-REVISIONS.md` — repo ildizida, `docs/` da EMAS.** Bu repoda `/docs`
gitignore qilingan (`.gitignore:12`), ya'ni u yerdagi ledger'ni na git ko'radi, na boshqa odam —
va ikkinchi nusxa jimgina birinchisidan uzoqlashadi.

Oxirgi catch-up pass: **2026-09-21**, backend HEAD `064ce64`. Unda F-07 (·0/·1/·3/·4) va
ikkita restore eshigi bajarildi. ⚠ Ledger **o'qilgan** va **bajarilgan** ni alohida ustunda
saqlaydi — ikkalasini aralashtirsangiz, keyingi pass o'z deltasini xato toraytiradi va buzuvchi
yozuv qayta o'qilmaydi. Protsedura shu repoda emas: `erp-backend-source` skill,
`references/return-pass.md`.

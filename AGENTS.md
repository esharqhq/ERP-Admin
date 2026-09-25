<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## ⚠ Backend kontrakti va ish ro'yxati — BIRINCHI SHUNI O'QING

Backend (`esharqhq/Germany-ERP`) — yagona haqiqat manbai, va u tez o'zgaradi.
Checkout: **`$env:GERMANY_ERP`** (`D:\Victus\Projects\Backend\Germany ERP` — yo'lda bo'sh joy
bor, har doim qo'shtirnoqqa oling). Kontraktning o'zi: `docs/handoff/` — **faqat push qilingan
`origin/main` dan o'qing** (`git fetch`, keyin `git show origin/main:<yo'l>`). ⚠ U checkout'da boshqa
agentlar ishlaydi: `pull`, `checkout`, `switch`, `stash` va hech qanday yozish QILMANG; working tree —
kontrakt emas.
Ustunlik: **jonli javob > guide > README/guidance.**

Uchta joy, har birining bitta nusxasi:

| Nima | Qayerda |
|---|---|
| **Protsedura** (qoidalar, birinchi o'qish, catch-up pass) | `erp-backend-source` skill — `.claude/skills/erp-backend-source/` |
| **Ledger** (watermark'lar, guide jadvali, pass log) | `BACKEND-REVISIONS.md` — repo ildizida, `docs/` da EMAS (`/docs` gitignore qilingan) |
| **Ochiq ish ro'yxati** | `BACKEND-REVISIONS.md` → **§3 Open work** |
| Backend'dan so'rovlar | `BACKEND-ASKS.md` |

Backend kontraktiga tegadigan har qanday ishdan oldin skill'ni yuklang. Oxirgi pass sanasi va
HEAD bu yerda yozilmaydi — ular faqat ledger §1 da turadi (ikkinchi nusxa jimgina eskiradi).

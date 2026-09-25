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

## ⚠ Dizayn — faqat Uyer dizayn tizimi, har bir ekranda

Panel **bir xil dizaynda** ketadi. Har qanday yangi yoki o'zgargan UI **Uyer dizayn tizimidan**
quriladi — o'zidan chizilgan karta, rang yoki o'lcham emas.

**Manba:** `../assets/general/Uyer-Design System.dc.html` (v1.0, forest green `#0F3D2E`, fresh
`#7ED957`, Geist / Geist Mono). Admin ekranlarining o'z dizaynlari: `../assets/Admin/*.dc.html`
(Dispatch, Tasks v2, Workers Table, Owner/Worker Detail, System Pages…) — ekran bo'lsa, avval o'shani oching.
⚠ `Uyer-Management-Design-System` repo'si (navy + gold) va navy "Mond" DS — boshqa mahsulot, ulardan
olmang.

**Tartib — kod yozishdan oldin:**
1. `components/ui/` va shu turdagi mavjud ekranlarga qarang: kerakli narsa deyarli har doim bor.
2. Bor bo'lsa — **o'shani ishlating**, nusxa ko'chirmang va "o'xshashini" chizmang.
3. Yo'q bo'lsa — DS faylidagi namunadan, `globals.css` tokenlaridan quring; ikki joyda kerak bo'lsa,
   `components/ui/` ga chiqaring.

**Tayyor komponentlar (avval shularni oling):**

| Kerak | Ishlating |
|---|---|
| Karta | `Card` + `CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent` |
| Son / hisob plitkasi | `SummaryStrip` + `SummaryTile` (`tone`: critical · warning · positive · neutral; `showCount`) |
| Holat belgisi | `Badge tone=` (success · warning · danger · primary · info · neutral); kun holati — `TaskStatusBadge` |
| Jadval | `components/ui/data-table` (+ `DataTableCard`, `FilterBar`, `FilterMenu`, `TablePagination`) |
| Jadval bo'sh / xato / ruxsat yo'q / yuklanish | `TableEmpty`, `TableNoMatch`, `TableError`, `TableForbidden`, `TableSkeletonRows` |
| Butun qator havola | `RowLink` |
| 2–4 variantdan tanlov | `ChoiceGroup` (hech narsa oldindan tanlanmagan) |
| Sana oralig'i | `DateRangeField` |
| Dialog / tasdiqlash | `Dialog`, `AlertDialog`; varaq — `Sheet` |
| Tugma, havola-tugma | `Button` (havola uchun `nativeButton={false}` + `render={<Link …/>}`) |
| Xodim to'lishi | `StaffingPipMeter`; progress — `Progress` |

**Qoidalar (DS §09 dan):**
- Ranglar — **faqat tokenlar** (`bg-status-*-tint`, `text-status-*-deep`, `bg-accent`, `text-primary`…).
  Hex, `text-blue-500` kabi Tailwind palitrasi, inline `style` rang — yo'q.
- Holat — **tinted chip**, hech qachon solid fill. Solid forest — ekran qismidagi **bitta** asosiy amal.
- Raqam, vaqt, ID, pul — **Geist Mono** (`font-mono tabular-nums`).
- UPPERCASE faqat 11px overline — `overline-label` utility. Qolgan hamma joy sentence case.
- Ikonka — faqat Lucide, 2px; ma'no tashisa 36px tinted plitkada (`rounded-[10px]`). Emoji yo'q.
- Qatorda **bitta** badge. Bo'sh katak — `–`.
- Bo'sh holat: ikonka plitkasi + bitta oddiy jumla + bitta amal, illyustratsiyasiz.
- Yuklanish — haqiqiy balandlikdagi skeleton, spinner emas.
- 768px dan past — jadval o'rniga ustma-ust qator kartalar, gorizontal scroll yo'q.
- Yangi ekran yonidagi kartaga **o'xshab** turishi kerak (sarlavha, padding, qator uslubi bir xil).

Ish tugaganda ekranni brauzerda ochib, yonidagi ekranlar bilan solishtiring — `tsc` dizaynni tekshirmaydi.

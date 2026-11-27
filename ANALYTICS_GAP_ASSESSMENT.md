# Analytics Gap Assessment: Court Management System (POS)

Petsa: Nov 26, 2026
Batayan: mga spec ng POS project (POS_DATA_MODEL, POS_REPORTS_SPEC, POS_DASHBOARD_SPEC, POS_COURT_BOOKINGS, POS_OPEN_PLAY_PAYMENTS_VOUCHERS, POS_QUEUING_SPEC, POS_MEMBERSHIP_SPEC, POS_COACHES_EXPENSES, POS_ROLES_PERMISSIONS)

Sinusuri nito kung kayang ipakita ng system ang analytics na gusto ng tatlong persona: **Court Owner**, **Investor** at **Business Consultant / Data Analyst**.

## Legend

| Status | Ibig sabihin |
|---|---|
| ✅ Meron na | Nakikita na sa Dashboard, Analytics o ibang tab |
| 🟡 Kulang ang view | May data na sa system, pero wala pang report o chart |
| ❌ Walang data | Hindi pa naitatala ng system ang kailangang data |

## Buod

| Status | Bilang |
|---|---|
| ✅ Meron na | 15 |
| 🟡 Kulang ang view | 38 |
| ❌ Walang data | 14 |
| **Kabuuan** | **67** |

## Mga pinakamalaking kulang

1. **Walang customer ID ang mga walk-in.** Dahil dito, hindi gagana nang maayos ang retention, cohort, RFM at customer journey. Ito ang pinakamalaking hadlang sa customer analytics.
2. **Binubura ang mga na-cancel at na-decline na booking** imbes na itago, kaya walang paraan para sukatin ang no-show, cancellation at kung ilan ang na-turn away.
3. **Walang record ng puhunan (capex),** kaya hindi ma-compute ang ROI at payback period.
4. **Walang target, YoY comparison at export ng report.** Mabilis itong idagdag at malaki ang maitutulong sa investor at consultant.

---

## 1. Court Owner

| # | Analytics na gusto | Status | Nasaan sa system / data | Ano ang kulang |
|---|---|---|---|---|
| 1 | Kita ngayong araw/linggo/buwan vs nakaraang period | ✅ | Dashboard (Income today / this month); Analytics summary band | — |
| 2 | Breakdown ng kita: court, open play, membership, coaching, store | 🟡 | Analytics Income: 4 streams (Court rental, Coaching, Open Play, Store) | Membership naka-halo sa Store; gawing sariling stream (may income by plan sa Analytics › Membership) |
| 3 | Cash vs GCash/Maya vs card | 🟡 | orders.payment.method; Shift totals / Z-report | Walang card na payment method; walang payment-method chart sa Analytics |
| 4 | Net profit matapos ang gastos | ✅ | Analytics Profit: Money in − all spending; Expenses tab | Cash basis lang, hindi accrual |
| 5 | Utilization % kada court at kada oras | ✅ | Analytics Courts: by court, by start hour, by weekday | — |
| 6 | Heatmap araw × oras | 🟡 | courtBookings (date, hour, court) | Hiwalay ang weekday at hour bars; walang pinagsamang heatmap |
| 7 | No-show at cancellation rate | ❌ | Cancel reservation at Decline ay nagbubura ng slot | Mag-log ng cancelled / no-show / declined status imbes na i-delete |
| 8 | Oras na nawala dahil sa ulan o maintenance | 🟡 | One-time schedule blocks (may label) | Walang closure reason (ulan, repair); hindi binibilang sa Analytics |
| 9 | Bagong players vs bumabalik | 🟡 | customers.createdAt + orders.customerId | Hindi ma-track ang walk-in na walang account |
| 10 | Top players (dami ng laro at gastos) | 🟡 | Membership top members; orders per customer; queueMatches | Walang top spenders para sa lahat; deferred ang Queuing session stats |
| 11 | Members na mag-e-expire at hindi na bumabalik | ✅ | Dashboard Needs your attention; Membership watch list (30 araw) | Kailangang naka-on ang membership license |
| 12 | Average na laro bawat player kada linggo | 🟡 | queueMatches (teams, endedAt) | Deferred ang session stats sa Queuing |
| 13 | Ilang player bawat Open Play session | ✅ | Analytics Open Play: per session, unique players, average | — |
| 14 | Average na hintay sa queue | 🟡 | queuePlayers.waitSince; queueMatches.calledAt | Wala pang wait-time report |
| 15 | Session na sobrang siksik o kulang sa tao | ✅ | Open Play fill % per session | — |
| 16 | Benta bawat cashier at bawat shift | 🟡 | orders.cashierId; shifts.totals | Out of scope sa v1 ang per-cashier reports |
| 17 | Voids, discounts, refunds at kung sino ang gumawa | 🟡 | voidReason; discount.reason; Audit log; settlement reversals | Walang summary report; void lang ang paraan ng refund |
| 18 | Kita at sessions bawat coach | ✅ | Coaches tab: sessions, fees, payouts | — |
| 19 | Best sellers, paubos, hindi gumagalaw na items | ✅ | Top items; low stock; Inventory Sold 30 days | Walang dead-stock list (0 benta sa X araw) |
| 20 | Today screen pagbukas | ✅ | Dashboard | — |
| 21 | Export to Excel/PDF para sa accountant | 🟡 | Settings › Download data (raw) | Out of scope sa v1 ang report export sa PDF/CSV |
| 22 | Simpleng insights / suggestions | ✅ | Analytics Highlights (hanggang 5 sentences) | Walang action suggestions (hal. promo sa bakanteng oras) |

## 2. Investor

| # | Analytics na gusto | Status | Nasaan sa system / data | Ano ang kulang |
|---|---|---|---|---|
| 23 | ROI at payback period | ❌ | — | Walang record ng puhunan (capex) at petsa ng simula |
| 24 | Net profit trend at margin (6–12 buwan) | 🟡 | Profit per range; This year range | Walang buwanang profit trend chart at margin % |
| 25 | EBITDA | ❌ | — | Walang depreciation, interest at tax sa expenses |
| 26 | Cash flow: pumapasok vs lumalabas | ✅ | Collected vs restock + expenses | Walang beginning/ending cash bawat buwan |
| 27 | Revenue growth MoM at YoY | 🟡 | Comparison vs previous period | Walang YoY (parehong period noong isang taon) |
| 28 | Paglaki ng member base at active players | 🟡 | Membership: active, new, renewals | Walang trend chart kada buwan; hindi tracked ang active non-members |
| 29 | Forecast ng kita (3–6 buwan) | ❌ | courtBookings hanggang 30 araw; membership expiries | Walang forecast model |
| 30 | Revenue per court / per available hour | 🟡 | Court rental income + open court-hours | Hindi pa kino-compute |
| 31 | Utilization kumpara sa target | 🟡 | Court utilization % | Walang target setting |
| 32 | Recurring vs walk-in revenue | 🟡 | Membership income; orders.customerId | Walang flag para sa regular bookings |
| 33 | Customer retention / churn | 🟡 | Membership renewal rate | Para sa members lang |
| 34 | Customer lifetime value vs CAC | ❌ | Marketing category sa Expenses | Walang customer source o attribution |
| 35 | Opex breakdown at mabilis tumaas na gastos | ✅ | Expenses by-category bars | Walang month-on-month trend kada category |
| 36 | Break-even point | 🟡 | Expenses + presyo ng court / Open Play | Hindi pa kino-compute |
| 37 | Seasonality | 🟡 | Order at booking history | Kailangan ng 12+ buwan ng data; walang weather data |
| 38 | Concentration (umaasa sa iilang customer/coach) | 🟡 | orders.customerId; Coaches tab | Walang % share ng top 10 |
| 39 | Fully booked na oras / na-turn away | 🟡 | Booked court-hours kada oras | Hindi naitatala ang na-turn away o declined requests |
| 40 | Kita ng events at tournaments | ❌ | One-time blocks lang | Walang event stream o event product |
| 41 | Paghahambing ng mga branch | ❌ | Single venue | Walang cross-branch view |
| 42 | One-page executive summary | 🟡 | Dashboard + Analytics summary band | Walang investor summary (ROI, payback, margin) |
| 43 | Monthly report na auto-send | ❌ | — | Walang scheduled PDF/email |
| 44 | Read-only access | 🟡 | Permissions matrix (View level) | Walang investor role; fixed ang listahan ng roles |

## 3. Business Consultant / Data Analyst

| # | Analytics na gusto | Status | Nasaan sa system / data | Ano ang kulang |
|---|---|---|---|---|
| 45 | Revenue bridge (volume, price, mix) | 🟡 | Order line snapshots (unitPrice, qty, category) | Hindi pa built |
| 46 | Drill-down hanggang transaction | 🟡 | Orders page | Walang click-through mula sa Analytics charts |
| 47 | Anomaly alerts | ❌ | — | Walang alert sa biglang taas o baba |
| 48 | Cohort retention | 🟡 | customers.createdAt + orders | Nawawala ang walk-in na walang customerId |
| 49 | RFM segmentation | 🟡 | orders.customerId, createdAt, total | Hindi pa built |
| 50 | Churn prediction | ❌ | Membership watch list lang | Walang model |
| 51 | Customer journey (walk-in → open play → booking → member) | 🟡 | orders, openPlayPaid, courtBookings, memberships | Kailangang consistent ang paggamit ng customer account |
| 52 | Price elasticity | 🟡 | Price snapshots sa orders | Walang price change log sa products |
| 53 | Dynamic pricing (peak/off-peak) | ❌ | — | Walang peak/off-peak pricing feature |
| 54 | Promo ROI | 🟡 | discount.reason; voucherUses.value | Walang baseline para sukatin ang dagdag na benta |
| 55 | Demand forecast kada oras | ❌ | Booking history | Walang forecast |
| 56 | Gap time sa pagitan ng bookings | 🟡 | courtBookings kada court-hour | Hindi pa kino-compute |
| 57 | Cost per court-hour | 🟡 | Expenses ÷ open court-hours | Hindi pa kino-compute |
| 58 | Staff productivity vs demand | ❌ | orders.cashierId | Walang staff schedule o timesheet |
| 59 | Attach rate (court + paninda) | 🟡 | Order items | Hindi pa built; minsan magkahiwalay na order ang booking at store |
| 60 | Basket analysis | 🟡 | orders.items | Hindi pa built |
| 61 | % ng transaksyon na may customer ID | 🟡 | orders.customerId | Walang data quality report |
| 62 | Pare-parehong kategorya | ✅ | categories collection; fixed expense categories | — |
| 63 | Audit trail ng edits at voids | ✅ | Audit log; stockMovements; voidReason | — |
| 64 | Target o benchmark bawat metric | ❌ | — | Previous period lang ang comparison |
| 65 | Period comparison filters | ✅ | Range chips + previous period | Walang YoY o custom vs custom |
| 66 | Raw data export / API | 🟡 | Settings › Download data | Walang API |
| 67 | Malinaw na KPI definitions | 🟡 | Nasa spec docs (POS_REPORTS_SPEC.md) | Hindi nakikita sa UI (hal. tooltip) |

---

## Top 3 ng bawat persona

| Persona | Top 3 |
|---|---|
| Court Owner | Kita, court utilization heatmap (+ breakdown ng kita) |
| Investor | Net profit trend, payback period, utilization |
| Consultant | Cohort retention, revenue bridge, promo ROI |

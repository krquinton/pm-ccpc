# PickleManage V2: Step-by-step setup

Nov 23, 2026 · @Ton

## Bago magsimula

Gawin ang mga hakbang nang sunod-sunod, isang beses lang. Libre lahat: Firebase Spark, Cloudflare Workers Free at Netlify Free. Lahat ng command ay pinapatakbo sa `D:\Documents\GitHub\PicklePOS\V2` maliban kung sinabi ng hakbang.

| Kailangan | Para saan | Paano i-check |
| --- | --- | --- |
| Node.js 22 o mas bago | Pagpapatakbo at pag-build ng V2 | `node -v` |
| Java 21 | Firestore emulator (rules check) | `java -version` |
| Firebase CLI | Pag-deploy ng rules at index | `npm install -g firebase-tools`, tapos `firebase login` |
| Google account na may access sa `picklepos-1da7b` | Ang live PicklePOS data | Buksan ang Firebase console |
| Cloudflare account | Ang Worker (`pm-platform`) | dash.cloudflare.com |
| Netlify account na naka-link sa GitHub | Pag-host ng app at Console | app.netlify.com |

Ang V1 ay tuloy-tuloy na gagana habang ginagawa mo ito. Parehong Firestore data ang gamit ng V1 at V2.

## Hakbang 1: I-install at subukan sa PC

Dapat pumasa lahat ng tests bago ka mag-deploy ng kahit ano.

1. Buksan ang terminal (PowerShell o VS Code) sa `V2` folder.
2. I-install ang packages, kasama ang bagong `exceljs`:

   ```
   npm install
   ```
3. Patakbuhin ang tests. Dapat ganito ang lumabas: shared 102, app 10, console 5, worker 13, lahat passed.

   ```
   npm test
   ```
4. Opsyonal: silipin ang V2 gamit ang demo data, walang Firebase na kailangan.

   ```
   npm run dev -w app -- --mode demo
   ```

   Buksan ang `http://localhost:5173/pos`. Subukan ang Open Play, Queuing, Court Bookings, Inventory at Dashboard. Ang TV display ay nasa `http://localhost:5173/pkl/display`.

## Hakbang 2: Licensing Firebase project

Ito ang hiwalay na project para sa licensing ng lahat ng apps mo. Gawin sa [Firebase console](https://console.firebase.google.com).

1. **Add project** → pangalan: `pm-licensing` → i-off ang Analytics.
2. **Build → Firestore Database** → Create → production mode → location `asia-southeast1`.
3. **Build → Realtime Database** → Create → Singapore (`asia-southeast1`) → locked mode. Kopyahin ang URL nito (hal. `https://pm-licensing-default-rtdb.asia-southeast1.firebasedatabase.app`).
4. **Build → Authentication** → Get started → **Google** → Enable.
5. **Project settings → General → Your apps → Web (`</>`)** → i-register bilang "Console" → kopyahin ang config values.
6. **Project settings → Service accounts → Generate new private key** → i-save ang JSON file sa ligtas na lugar, labas ng repo.
7. Sa `picklepos-1da7b` project, gawin din ang hakbang 6 para makuha ang PicklePOS service account JSON.
8. I-deploy ang licensing rules:

   ```
   cd firebase
   copy .firebaserc.example .firebaserc
   firebase deploy --config firebase.licensing.json --project licensing --only firestore,database
   ```

Huwag i-commit ang dalawang service account JSON. Naka-ignore na ang `service-account*.json` sa `.gitignore`.

## Hakbang 3: PicklePOS rules at index

Pinapalitan ng V2 rules ang V1 rules, pero tuloy pa ring gagana ang V1 staff accounts. Hindi ko pa ito na-compile, kaya i-check muna sa emulator.

1. I-check kung nagko-compile ang rules (kailangan ng Java):

   ```
   cd firebase
   firebase emulators:start --only firestore --project demo-pm
   ```

   Dapat "All emulators ready" ang lumabas. Pindutin ang Ctrl+C para huminto. Kung may error, i-send mo sa akin ang buong mensahe.
2. Inirerekomenda: subukan muna sa test project (`picklepos-dev`) kung meron ka:

   ```
   firebase deploy --only firestore --project pos-dev
   ```
3. Kapag handa ka na, i-deploy sa live. Kasama na rito ang bagong index para sa stock history ng Inventory:

   ```
   firebase deploy --only firestore --project pos
   ```
4. Hintaying matapos ang index build: **Firestore → Indexes**, dapat "Enabled" ang `stockMovements`. Ilang minuto lang ito.

## Hakbang 4: Cloudflare Worker

Ang Worker (`pm-platform`) ang nag-a-apply ng licenses, gumagawa ng staff accounts, nagbibilang ng devices at nagbabasa ng Reclub.

1. Mag-login at ilagay ang tatlong secrets. Kapag nag-prompt, i-paste ang BUONG laman ng JSON file:

   ```
   cd worker
   npx wrangler login
   npx wrangler secret put LICENSING_SA
   npx wrangler secret put POS_SA
   npx wrangler secret put OWNER_SETUP_KEY
   ```

   Sa `OWNER_SETUP_KEY`, mag-type ng mahabang random na text (12+ characters) at tandaan ito.
2. Buksan ang `worker/wrangler.toml` at i-check:
   - `LICENSING_DB_URL` = ang Realtime Database URL mula Hakbang 2.3
   - `PRODUCTS` → `projectId` = `picklepos-1da7b` (o `picklepos-dev` habang nagte-test)
3. I-deploy:

   ```
   npx wrangler deploy
   ```
4. Kopyahin ang Worker URL (`https://pm-platform.<ikaw>.workers.dev`). Kapag binuksan mo, dapat lumabas ang `{"service":"pm-platform","ok":true}`.

## Hakbang 5: I-deploy ang app at Licensing Console

Dalawang Netlify site ang gagawin mula sa iisang GitHub repo. Subukan muna sa PC bago i-online.

1. Gawin ang env files at punan ang values:

   ```
   copy console\.env.example console\.env
   copy app\.env.example app\.env
   ```
   - `console/.env`: web config ng `pm-licensing` (Hakbang 2.5), ang Realtime Database URL, at ang Worker URL.
   - `app/.env`: web config ng `picklepos-1da7b`, ang Worker URL, at ang `apiKey` at Database URL ng `pm-licensing`.
2. Subukan sa PC: `npm run dev -w console` (bubukas sa `http://localhost:5174`) at `npm run dev -w app` (bubukas sa `http://localhost:5173/pkl/login`).
3. Sa Netlify, gumawa ng dalawang site mula sa repo:

| Site | Base directory | Build command | Publish directory |
| --- | --- | --- | --- |
| PicklePOS V2 | `V2` | `npm run build -w app` | `V2/app/dist` |
| Licensing Console | `V2` | `npm run build -w console` | `V2/console/dist` |

4. Ilagay sa **Site configuration → Environment variables** ng bawat site ang laman ng kani-kaniyang `.env`. Sa Console site, idagdag ang `VITE_APP_URL` = URL ng app.
5. Sa **parehong** Firebase projects: **Authentication → Settings → Authorized domains** → idagdag ang dalawang Netlify domain.
6. Sa `worker/wrangler.toml`, palitan ang `ALLOWED_ORIGINS` ng dalawang URL (hal. `"https://app.domain.com,https://console.domain.com"`), tapos `npx wrangler deploy` ulit.

Hayaan muna ang lumang `netlify.toml` sa root. Ito pa rin ang nagse-serve ng V1 hanggang matapos ang cutover.

## Hakbang 6: Owner setup at unang client

Gagawin mo ito sa Licensing Console (sa PC o sa Netlify URL).

1. **Sign in with Google.**
2. Lalabas ang **Finish owner setup** → i-type ang `OWNER_SETUP_KEY` → **Confirm owner**.
3. Burahin agad ang key para walang ibang makagamit:

   ```
   cd worker
   npx wrangler secret delete OWNER_SETUP_KEY
   ```
4. **Products & modules → Add PicklePOS.**
5. **Packages → New package.** Halimbawa: *POS Basic* (Core POS + Accounts) at *POS Pro* (lahat ng modules).
6. **Clients → New client.** Para sa sarili mong venue, gamitin ang venue code **`pkl`**. Dapat tugma ito sa company id ng V1.
7. Buksan ang client → **Assign a package.** Isusulat nito ang license sa PicklePOS at ia-update ang lahat ng staff logins.
8. Mag-sign in sa V2 bilang owner (`/pkl/login`) gamit ang dating V1 username at password. Awtomatikong maa-activate ang account sa unang sign-in.

Para sa **bagong** client: pindutin ang **Create first login**, tapos ibigay sa kanila ang app link, venue code, username at password.

## Hakbang 7: Ihanda ang venue at lumipat sa V2

Isang venue lang sa bawat pagkakataon. Gawin ang checklist sa V2 bilang owner, tapos isang araw na sabay ang V1 at V2.

- [ ] **Settings → Open Play:** ilagay ang Reclub club link (hal. `https://reclub.co/clubs/@pkl`). Dati itong nasa `config.js` ng V1.
- [ ] **Settings → General:** tugma ang bilang ng courts sa license.
- [ ] **Menu:** may product na "Open Play" na may session options ("morning", "evening 1", "evening 2").
- [ ] **Menu:** may product na may "Court Rental" sa pangalan; kasama ito sa coaching packages.
- [ ] **Menu:** may option group na "Coach" na ang options ay ang mga coach.
- [ ] **Court Bookings → Schedule:** naka-set ang oras ng bukas at sarado at ang blocks (hal. Open Play tuwing Lunes, 4–8 PM).
- [ ] **Settings → General:** naka-generate ang daily PIN.
- [ ] Makapag-sign in ang staff gamit ang venue code, at tama ang bilang ng devices.
- [ ] Buksan sa TV browser ang `/{venue}/display`. Walang sign-in na kailangan.
- [ ] Ibahagi ang `/{venue}/book` kung naka-license ang Public booking.

**Parity run (isang araw):** sa V2 gawin ang benta, void, charge, settle, renew ng membership, Open Play (cash, GCash, free pass, credit, settle later), check-in, queue, booking at pay, reserve at move, approve ng online booking, restock, expense, coach payout, at close ng shift. Ikumpara ang Z-report, Dashboard at Analytics sa V1 para sa parehong araw.

Kapag tugma, sabihan ang staff na V2 link na ang gamitin.

## Kung may problema

**Rollback:** sabihan ang staff na bumalik sa V1 link. Walang data na kailangang ilipat, kasi iisa lang ang data ng V1 at V2.

| Problema | Gawin |
| --- | --- |
| Hindi nagko-compile ang rules sa emulator | I-send sa akin ang buong error. Huwag munang i-deploy. |
| "Permission denied" sa isang page | I-check kung na-deploy na ang V2 rules at kung kasama ang module sa package ng client. |
| Walang lumalabas sa stock history ng Inventory | Hintaying maging "Enabled" ang index sa Firestore → Indexes. |
| Walang sessions sa Open Play | I-check ang Reclub club link sa Settings → Open Play at kung bukas ang Worker URL. |
| Hindi gumagalaw ang TV display | Dapat may isang device na naka-"This device runs the queue" sa Queuing tab. |
| Ayaw mag-sign in ng staff | I-check ang venue code, at kung na-assign na ang package sa Console. |

**Kulang pa sa V2 (gamitin muna ang V1):** pag-merge ng dalawang customer account, pag-void ng Open Play slot na na-cancel at na-credit, net worth sa Analytics, at online coaching requests sa public booking page.

**Free plan limits:** hanggang 100 sabay na device connections sa lahat ng clients (makikita sa Console → Devices & system). Mga 50k reads at 20k writes kada araw ang Firestore ng PicklePOS, nagre-reset bandang 4 PM.

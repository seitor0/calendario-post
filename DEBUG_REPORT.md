# Debug Report — Calendario Post (Firestore permissions)

## Scope
This report documents the Firestore reads/writes executed during calendar load, the debug instrumentation added, and how to identify the exact failing call that triggers `FirebaseError: Missing or insufficient permissions`.

## Files that handle calendar load
- `app/page.tsx` — Auth gate, calendar data load, and read/write triggers.
- `lib/storage.ts` — Firestore reads for clients, posts, events, paids, reads, and daySeen.
- `lib/useCurrentUser.ts` — Ensures and subscribes to `/users/{uid}` profile doc.
- `components/CalendarMonth.tsx` — Calendar view (UI only; data comes from `app/page.tsx`).
- `components/RightPanel.tsx` — Detail view (UI; reads/writes flow through `app/page.tsx`).

## Firestore reads/writes executed during calendar load
### Reads
1) `/users/{uid}`
   - **File:** `lib/useCurrentUser.ts`
   - **Operation:** `getDoc` + `onSnapshot`

2) `/clients/{clientId}` (one per `allowedClients`)
   - **File:** `lib/storage.ts` → `fetchClientsForProfile`
   - **Operation:** `getDoc`

3) `/clients/{clientId}/posts` filtered by `monthKey`
   - **File:** `lib/storage.ts` → `loadClientMonthData`
   - **Operation:** `getDocs` with `where("monthKey", "==", monthKey)`

4) `/clients/{clientId}/events` filtered by `monthKey`
   - **File:** `lib/storage.ts` → `loadClientMonthData`
   - **Operation:** `getDocs` with `where("monthKey", "==", monthKey)`

5) `/clients/{clientId}/paids` filtered by `monthKey`
   - **File:** `lib/storage.ts` → `loadClientMonthData`
   - **Operation:** `getDocs` with `where("monthKey", "==", monthKey)`

6) `/users/{uid}/reads` filtered by `clientId` and `monthKey`
   - **File:** `lib/storage.ts` → `loadThreadReads`
   - **Operation:** `getDocs` with `where("clientId", "==", clientId)` and `where("monthKey", "==", monthKey)`

7) `/users/{uid}/daySeen` filtered by `monthKey`
   - **File:** `lib/storage.ts` → `loadDaySeen`
   - **Operation:** `getDocs` with `where("monthKey", "==", monthKey)`

### Writes (can happen during initial load)
8) `/users/{uid}`
   - **File:** `lib/useCurrentUser.ts`
   - **Operation:** `setDoc` (if missing) or `updateDoc` (on login)

9) `/users/{uid}/daySeen/{YYYY-MM-DD}`
   - **File:** `lib/storage.ts` → `markDaySeen`
   - **Triggered:** after `selectedDate` effect in `app/page.tsx`

10) `/users/{uid}/reads/{threadId}`
   - **File:** `lib/storage.ts` → `markThreadRead`
   - **Triggered:** after selecting a post/event/paid

## Debug instrumentation added
### Helper
- `lib/debugFirestore.ts`
  - `logAuthState()`
  - `safeGetDoc(ref, label)`
  - `safeGetDocs(query, label)`
  - `safeSetDoc(ref, data, options, label)`
  - `safeUpdateDoc(ref, data, label)`

These wrappers log:
- label + path/query
- execution time
- Firebase error code/message

### Debug panel
Visible only when:
- `?debug=1` is present, or
- `NEXT_PUBLIC_DEBUG=true`

Panel shows:
- auth uid/email
- activeClientId
- monthKey + selectedDate
- profile roles + allowedClients
- direct read result of `/users/{uid}`
- button to test permissions for:
  - `/clients/{activeClientId}`
  - `/clients/{activeClientId}/posts (limit 1)`
  - `/clients/{activeClientId}/events (limit 1)`

## How to reproduce and capture the failing query
1) Start locally:
   - `npm install`
   - `npm run dev`
2) Open: `http://localhost:3000/?debug=1`
3) Log in with Google
4) Watch the console for `[Firestore] getDoc` / `getDocs` errors
5) Click **Test permissions** in the Debug Panel

## Observed failure (fill from logs)
- **Failing call (exact label/path):**
  - Example: `clients/ABC123/posts?monthKey=2026-01`
- **Error:**
  - Example: `permission-denied: Missing or insufficient permissions`
- **Auth state:**
  - `uid=...`, `email=...`
- **Profile data:**
  - `roles=...`, `allowedClients=[...]`
- **activeClientId:**
  - `...`

## Likely root causes to validate
- `activeClientId` is empty or not in `allowedClients`.
- `/users/{uid}` doc missing (rules may block creation/read).
- Rules don’t allow `list`/`get` on `/clients/{clientId}` for allowed clients.
- Rules don’t allow access to `/clients/{clientId}/posts|events|paids`.
- Rules don’t allow writes to `/users/{uid}/daySeen` or `/users/{uid}/reads`.
- `allowedClients` is not an array of client IDs (wrong structure or empty).
- Required index for a compound query (only if new `orderBy` was added later).

## Recommendations
- Confirm `/users/{uid}` exists and can be read.
- Confirm `allowedClients` includes `activeClientId` exactly.
- Confirm rules allow:
  - `get` on `/clients/{clientId}` when `clientId in allowedClients`
  - `read` on `/clients/{clientId}/posts|events|paids` when allowed
  - `read/write` on `/users/{uid}/reads` and `/users/{uid}/daySeen` for same uid
- If the failing call is `getDocs` on subcollections, verify rules allow **list** (not just get).
- If the failing call is on `/users/{uid}` reads/writes, verify rules allow user self-access.

## Checklist (verification)
- [ ] `/users/{uid}` exists and is readable
- [ ] `activeClientId` is in `allowedClients`
- [ ] `/clients/{clientId}` allows list/get
- [ ] No unauthorized `collectionGroup` queries
- [ ] No writes during load that violate rules (`daySeen`, `reads`)
- [ ] No index requirement errors from `where`/`orderBy`

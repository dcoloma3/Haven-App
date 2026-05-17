# Haven — Task Backlog

> This file is the persistent task list for the Haven project.
> At the start of each Claude session, read this file and sync it with the todo sidebar.
> Add new ideas here anytime — just ask Claude to add a task, or edit this file directly.

---

## 🔴 Needs to Happen Soon

- [ ] Add real phone number to `TrialExpired.jsx` — replace `+1 (XXX) XXX-XXXX` with Google Voice number
- [ ] Get a Google Voice number for customer support
- [ ] Confirm `domcoloma+trial@gmail.com` email confirmation link and verify trial setup completes correctly
- [ ] Wire up "Get Full Access" button in trial banner + `TrialLockedFeature` to a real upgrade/contact flow

---

## 🟡 Important But Not Urgent

- [ ] Set up `support@haven.care` email forwarding once domain is live
- [ ] Set up custom domain (`haven.care`) and configure DNS + Vercel deployment
- [ ] Replace all `alert()` calls with a toast notification system (e.g. `react-hot-toast`)
- [ ] Test full signup → email confirm → dashboard flow with a fresh email address end-to-end

---

## 🟢 Nice to Have / Polish

- [ ] General UI polish pass across all pages (spacing, consistency, mobile responsiveness)
- [ ] Delete or keep "Sunrise Test Home" test community in Supabase

---

## 💡 Ideas & Future Features

> Dump new ideas here. Nothing is too small or too big.

- [ ] (add ideas here)

---

## ✅ Completed

- [x] Collapsible desktop sidebar with localStorage persistence
- [x] Community Picker visual polish (initials avatars, compact rows)
- [x] ResidentDetail tabs consolidated from 18 → 6
- [x] Dispense page: auto-expand time slots, progress bar, expand/collapse all
- [x] ShiftLog: auto-detect current shift, simplified filter bar
- [x] Extract `completeTrial()` to shared `src/lib/trial.js`
- [x] Fix email mismatch bug in `App.jsx` `onAuthStateChange` (email guard added)
- [x] Trial flow verified: banner ✓, locked routes ✓, expired screen ✓

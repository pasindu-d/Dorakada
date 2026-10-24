# Dorakada Fix Prompts Progress

Tracking progress in the recommended sending order from `FIX_PROMPTS.md`.

## Step 1: Context & Standing Rules
- [x] **Prompt 0** – Context and standing rules (**done**)

## Step 2: Critical Security Fixes & Drive Cleanup
- [x] **Prompt 1** – Back end has no authentication (**done**)
- [x] **Prompt 2** – Open proxy (`/api/proxy`) (**done** – in-memory limiter + Vercel Firewall rule)
- [x] **Prompt 3** – Plain-text passwords stored in the Sheet (**done**)
- [x] **Prompt 4** – Private user data returned to anyone (**done**)
- [x] **Prompt 7** – All bookings readable by anyone (**done**)
- [x] **Prompt 9** – Image cleanup deletes booking photos and receipts (**done**)

## Step 3: Services-Only Restructure & New Database
- [x] **Prompt 24** – Services only, one service ad per account, Free / Gold / Platinum (**done**)
- [x] **Prompt 25** – Rebuild the Google Sheet database with correct header-based mapping (**done**)

## Step 4: Auth, Booking Flow & Contact Privacy
- [x] **Prompt 28** – Booking flow, contact privacy, Google-only login (replaces most of Prompt 8) (**done**)

## Step 5: PAYable Payments & Downgrade
- [ ] **Prompt 26** – Secure card payments with PAYable (replaces Prompts 5 & 15) (**pending**)
- [ ] **Prompt 27** – Platinum → Gold downgrade: immediate, balance converted, no refund (**pending**)

## Step 6: Emails & Expired-Plan Lock
- [ ] **Prompt 29** – Branded email system with `MailApp.sendEmail()` (replaces Prompt 20) (**pending**)
- [ ] **Prompt 30** – Expired plans: grace period, listing lock and hiding (covers Prompt 12) (**pending**)

## Step 7: Account Deletion
- [ ] **Prompt 31** – Full account deletion: sheet rows + Drive images + login (replaces Prompt 6) (**pending**)

## Step 8: Remaining Bugs (Applied to New Code)
- [ ] **Prompt 10** – Double booking of the same slot (**pending**)
- [ ] **Prompt 11** – Duplicate member IDs (race condition) (**pending**)
- [ ] **Prompt 13** – Failed saves reported as success (**pending**)
- [ ] **Prompt 14** – Heavy maintenance work on every request (**pending**)
- [ ] **Prompt 16** – Wrong column used as member ID in bookings (**pending**)
- [ ] **Prompt 17** – Booking status stored in the browser (**pending**)
- [ ] **Prompt 18** – Plan limits differ between front end and back end (**pending**)
- [ ] **Prompt 19** – Silver/Gold duplicate tier (**pending**)

## Step 9: Remove Unnecessary Code & Clean Up
- [ ] **Prompt 32** – Remove unnecessary code after restructure (**pending**)
- [ ] **Prompt 21** – Duplicate helper functions (**pending**)
- [ ] **Prompt 22** – Outdated docs, unused Firebase files and packages (**pending**)
- [ ] **Prompt 23** – Old "FlashMyDeal" name and unused code (**pending**)

## Step 10: Setup Guide & Final Check
- [ ] **Prompt 33** – Step-by-step setup guide (`docs/SETUP_GUIDE.md`) (**pending**)
- [ ] **Final check** – Lint, build, verification tests, and deployment checklist (**pending**)

---

## Prompts Replaced by Part 2 (Track if skipped or partially needed)
- [ ] **Prompt 5** – Paid plans activated without correct payment *(covered by Prompt 26)*
- [ ] **Prompt 6** – `deleteUser` can wipe whole sheets *(replaced by Prompt 31)*
- [ ] **Prompt 8** – Email verification can be bypassed *(replaced by Prompt 28)*
- [ ] **Prompt 12** – Free trial can be renewed forever *(covered by Prompts 25 & 30)*
- [ ] **Prompt 15** – Checkout sessions stored in server memory *(covered by Prompt 26)*
- [ ] **Prompt 20** – Contact form and email HTML issues *(covered by Prompt 29)*

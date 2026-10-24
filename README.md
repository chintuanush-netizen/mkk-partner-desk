# Anandam Villas Partner Desk

Partner Desk, Admin Desk and live inventory board for **KGR Fortune Anandam Villas**, sold by **Milke Khareedo** with technology by **Leadnest**.

Live at **https://milkekhareedo.in/partners/**

| Path | Who | What |
| --- | --- | --- |
| `/partners/login`, `/signup`, `/forgot` | Everyone | Email and password accounts |
| `/partners/` | Partner | Enrolment form → "under review" → Partner Desk once approved |
| `/partners/` | Admin | Command centre, approvals, all leads, partners, settings |
| `/partners/inventory` | Public | Live Phase 1 inventory board, no login needed |

## How it works

- **Partners** sign up, fill a 3-step enrolment form and wait for approval. Once approved they get the desk: Home · Leads · Register · Board · Stats.
- **Registering a client** starts with country code and phone number. The number is checked instantly: if another partner holds that client, the partner is told it is taken, without revealing who.
- **60-day protection.** When an admin approves a lead, the client is protected for that partner for 60 days from registration. Admins can extend, release or reassign. Partners can move a lead to Contacted, Negotiation or Lost; site visits, EOI, cheques and bookings are confirmed by the Milke Khareedo team.
- **Every action is logged** in the lead's history, and attempts to register a protected number are logged for admins.
- **Inventory board**: live statuses, hold dates, plan locator, client sharing on WhatsApp, cost sheets and a partner pack PDF. Admins edit statuses and pricing from the board.

All rules are enforced in the database (row-level security plus checked functions), not just in the browser.

## Project layout

```
src/
  main.jsx, App.jsx        Router and role gate
  lib/                     Supabase client, auth and data providers, formatting, lead rules
  components/              Shell (brand bar + tab bar), sheet, icons, toasts
  pages/auth/              Login, sign-up, password reset, enrolment, waiting room
  pages/partner/           Partner home and stats
  pages/admin/             Command centre, approvals, partners, settings
  pages/shared/            Leads list, lead detail sheet, register flow
  board/                   Inventory board, plan coordinates, PDF exports
  styles/                  desk.css (app), board.css (inventory board, scoped to .bp)
public/assets/             Master layout and elevations
supabase/migrations/       Database schema, access rules and functions
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173/partners/
npm run build    # outputs dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to the `deploy` branch. Hostinger's Git auto-deployment for milkekhareedo.in pulls the `deploy` branch into `public_html/partners`.

`public/.htaccess` sends every unknown path under `/partners/` to `index.html`, so links like `/partners/leads` work when opened directly.

## Database

Supabase project `rhyauiovwdnsnaclempy`. Migrations in `supabase/migrations/` are applied in order. Admin access comes from the `kgr_owners` table, bound to an account's user id. To add an admin, have them create an account first, then:

```sql
insert into public.kgr_owners (email, user_id)
select email, id from auth.users where email = 'their@email.com';
```

Supabase Auth settings to keep in place:

- Authentication → URL Configuration: Site URL `https://milkekhareedo.in/partners/`, redirect URL `https://milkekhareedo.in/**`
- Authentication → Emails: custom SMTP (e.g. a Hostinger mailbox) so partners receive confirmation and password-reset emails

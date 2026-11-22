# Vicit on an intranet (single agency, no internet)

This guide covers a standalone deploy, e.g. DHQ or the Nigerian Army on its own LAN, from v33 on. v33 is single-agency and fully local: no in-app calls, no guest emails, no guest self-upload.

## 1. Server

- One Linux server on the LAN (4 vCPU, 8 GB RAM, 100 GB SSD is plenty for one HQ).
- Install Docker Engine and the compose plugin from offline packages if the site has no internet. Build the images once on a connected machine, then move them across with `docker save` / `docker load`.
- Give it a **fixed IP** and a hostname in the local DNS, e.g. `vicit.dhq.local → 10.10.0.20`. Without local DNS, add the name to each gate device's hosts file.

## 2. Configure

Copy `.env.example` to `.env` on the server only. Secrets never go in git.

| Variable | Value |
|---|---|
| `ORGANIZATION`, `ORGANIZATION_CODE` | e.g. `Nigerian Army`, `NA` |
| `SINGLE_AGENCY_CODE` | optional; defaults to `ORGANIZATION_CODE`. Single agency is the default |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first Super Admin. Set the password in `.env` only; change it after first login |
| `JWT_SECRET`, DB password | long random values (`openssl rand -hex 32`) |
| `FRONTEND_URL`, `CORS_ORIGIN` | `https://vicit.dhq.local` |
| `NEXT_PUBLIC_API_URL` | `https://vicit.dhq.local/api` (or the API host you proxy) |
| `ENABLE_PUSH` | default `false` (web push needs the internet). In-app alerts still arrive live |
| `MAIL_ENABLED` | default `false`: nothing is emailed. Set `true` only with an internal mail relay |
| `SMTP_*` | used only when `MAIL_ENABLED=true` (welcome, password reset, host alerts). Guests are never emailed |
| `EXTERNAL_HOST_SMS` | `false` (paper-request hosts get the passphrase from the admin; SMS hook only logs) |

Then: `docker compose up -d --build`. The backend runs migrations and the seed on start.

The seed creates only the Super Admin (from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`), the agency, and default gates at location **Headquarters**:

- **Main Gate** (checkpoint 1) with two points: **North Main Gate** and **South Main Gate**
- **Agency Gate** (checkpoint 2)

Rename or delete them in **Locations**. Deleted gates are not re-created on restart.

Roles: Super Admin, Agency Admin, Staff, Gate Officer.

Colours and logo: sign in as Super Admin → **Branding**. Nothing is hardcoded.

## 3. HTTPS on the LAN (needed for the gate camera)

Browsers only open the camera on HTTPS (or localhost).

1. Create a local CA once (e.g. `mkcert -install` on an admin PC, or your agency PKI).
2. Issue a certificate for `vicit.dhq.local` (and the IP) and put it on a reverse proxy (nginx/Caddy) in front of ports 3000 and 4000.
3. Install the **CA certificate** (not the server key) on every gate phone/tablet/PC:
   - Android: Settings → Security → Encryption & credentials → Install a certificate → CA certificate.
   - iOS: install the profile, then Settings → General → About → Certificate Trust Settings → enable it.
   - Windows: import into "Trusted Root Certification Authorities".
4. Open `https://vicit.dhq.local` on the device. It should show no warning, and "Add to home screen" installs the app.

## 4. Fully local / offline

- Fonts (Inter, `frontend/public/fonts`), icons and scripts are bundled. The app makes no internet requests. Upload the logo in Branding rather than linking one.
- The PWA service worker caches the app shell, fonts and static assets, so the app opens even if the server is unreachable. Scans, saves and other actions need the local server. There is no offline scan queue.
- When the server can't be reached, a short "Offline" banner shows at the top and clears by itself.
- Calls: the gate page **Phone call** button dials the host's phone (`tel:`). No in-app calling, no TURN/STUN.

## 5. Nightly backup

Cron on the server (02:00 every night, keep 14 days):

```
0 2 * * * cd /opt/vicit && docker compose exec -T db pg_dump -U vicit -Fc vicit_llog > /backup/vicit-$(date +\%F).dump && find /backup -name 'vicit-*.dump' -mtime +14 -delete
```

Also copy the photo volume (`/data/photos` in the backend container) to `/backup` weekly. Restore with `pg_restore -c -d vicit_llog`. Test a restore once a quarter.

## 6. RFID badges (option 4)

- **Reader:** ACR122U (USB, 13.56 MHz) or any generic USB HID 13.56 MHz reader in **keyboard-wedge** mode: it types the card UID and presses Enter. One per issuing desk and one per exit point.
- **Cards:** MIFARE Classic 1K, CR80 size, printable PVC (for the photo badge).
- Branding → Gate pass protocol → **RFID badge**.
- Issue: on the guest card tap the card in the "Tap card on reader" box, then print the photo badge onto it.
- Any checkpoint/exit: just tap the card on the gate page (no box needs focus). It opens the guest like a QR scan.
- At exit the card is marked returned and can be reused. Cards not returned are flagged on "Tags / passes out".
- An ACR122U needs its keyboard-wedge utility on Windows. Generic HID readers work with no driver.

## 7. Updates

Unzip the new release over `/opt/vicit` (keep `.env`), then `docker compose up -d --build`. Back up first. v33's migration drops in-app call history and the Super Admin II / Super Gate Officer roles (those users become Agency Admin / Gate Officer); other migrations are additive.

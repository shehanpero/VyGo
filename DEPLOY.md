# Deploying VyGo (full stack, free tier)

VyGo is three parts that must all be online for login/bookings to work:

```
[browser] --https--> [Netlify: React frontend] --proxy /api--> [Render: Spring Boot backend] --JDBC--> [MySQL]
```

GitHub itself only stores the code. It does **not** run Java, PHP or MySQL, so it cannot host the working site by itself.

| Part | Host | Folder in this repo | Free? |
|------|------|---------------------|-------|
| Frontend | Netlify | `frontend/` | Yes |
| Backend  | Render | `backend/`  | Yes (sleeps when idle) |
| Database | Railway / Aiven / Clever Cloud | `database/` | Yes (small) |

Files already prepared for you:
- `netlify.toml` – Netlify build + API proxy (`/api/*` and `/uploads/*` → backend)
- `render.yaml` – Render Blueprint that builds `backend/Dockerfile`
- `backend/Dockerfile` – builds `vygo-backend-1.0.0.jar` on Java 21
- `.gitignore` – keeps 1.4 GB of build junk out of Git (repo is now ~5 MB)

---

## Step 1 — Push the code to GitHub

1. On github.com click **New repository**, name it `vygo`, **Private** is fine, do **not** add a README. Click **Create**.
2. Copy the repo URL shown (e.g. `https://github.com/YOURNAME/vygo.git`).
3. Run these in the project folder (`G:\PEROVIN\vygo`):

```powershell
git branch -M main
git remote add origin https://github.com/YOURNAME/vygo.git
git commit -m "Initial commit"
git push -u origin main
```

A browser window will open to sign in to GitHub the first time. When it finishes, refresh the repo page — you should see the files.

> If Git complains about "dubious ownership" again, the fix was already applied for this folder
> (`git config --global --add safe.directory G:/PEROVIN/vygo`). On another PC run the same command.

---

## Step 2 — Create the MySQL database

Pick **one** provider and create a free MySQL instance:

- **Railway** (easiest): New Project → Provision MySQL. It gives you Host, Port, User, Password, Database.
- **Aiven** (no card): free MySQL, same details.
- **Clever Cloud**: free MySQL add-on.

Then load the schema and demo data. Your provider usually creates a database for you, so remove the
first two lines of `database/schema.sql` (`CREATE DATABASE ...` / `USE vygo;`) if your account can't create databases.

```powershell
# run from the project folder; replace the placeholders with your provider's values
mysql -h HOST -P PORT -u USER -p DATABASE_NAME < database/schema.sql
mysql -h HOST -P PORT -u USER -p DATABASE_NAME < database/seed.sql
```

Record these — you need them for the backend:
```
DB host, DB port, DB name, DB user, DB password
```

> Note: the backend's `prod` profile uses `ddl-auto: validate`, so the schema **must** be loaded first,
> otherwise the backend will refuse to start. Auto-seeding only happens in `dev`, never in `prod`.

---

## Step 3 — Deploy the backend on Render

1. render.com → **New +** → **Blueprint** → connect your GitHub → pick the `vygo` repo.
2. Render reads `render.yaml` and asks for these values (see Step 2 for the DB ones):

| Env var | Value |
|---------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` (already set) |
| `VYGO_JWT_SECRET` | a long random string (40+ chars) |
| `VYGO_QR_SECRET` | a different long random string |
| `VYGO_DB_URL` | `jdbc:mysql://HOST:PORT/DBNAME?useSSL=true&serverTimezone=Asia/Colombo` |
| `VYGO_DB_USER` | your DB user |
| `VYGO_DB_PASS` | your DB password |
| `VYGO_CORS_ORIGINS` | your Netlify URL (fill in after Step 4) |

3. Deploy. When it's live, test the health check in a browser:
   `https://YOUR-BACKEND.onrender.com/api/v1/health` → should return JSON (not an error).
4. Copy that backend URL — you need it for Step 4.

> Generate secrets in PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`

---

## Step 4 — Deploy the frontend on Netlify

1. **First**, paste your backend URL into `netlify.toml` (replace **both** placeholders):

```toml
to = "https://YOUR-BACKEND.onrender.com/api/:splat"
to = "https://YOUR-BACKEND.onrender.com/uploads/:splat"
```

Then commit that change:
```powershell
git add netlify.toml
git commit -m "Point frontend proxy at backend"
git push
```

2. netlify.com → **Add new site** → **Import an existing project** → GitHub → pick `vygo`.
   Netlify reads `netlify.toml` automatically (base `frontend`, publish `dist`). Click **Deploy**.
3. Copy your live URL, e.g. `https://vygo-demo.netlify.app`.
4. Back in Render, set `VYGO_CORS_ORIGINS` to that URL and redeploy (only needed if you ever call the API
   directly; the Netlify proxy already makes calls same-origin, so CORS is not triggered).

---

## Step 5 — Share it

Send friends your Netlify URL: `https://vygo-demo.netlify.app`. Everyone sees the same live app and shared database.

---

## Testing

- **Register a new account** in the app and try a search → book → pay (sandbox) flow. This definitely works.
- The users in `database/seed.sql` are demo rows; some password hashes there are placeholders.
  If a seeded login fails, either register fresh or ask me to generate a valid bcrypt hash for `password123`.

## Free-tier reality check

- **Render free services sleep** after ~15 min idle. The first request then takes ~30–60 s to wake.
- Free MySQL tiers have small storage/connection limits — fine for a demo, not for real traffic.
- Every `git push` to `main` auto-redeploys both Netlify and Render.

## Optional — the PHP site

The top-level `index.php`, `header.php`, … are a separate static/legacy site. They need a PHP host
(Hostinger, InfinityFree, etc.). They are **not** part of the Netlify/Render deployment above.

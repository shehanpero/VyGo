# VyGo Android — Release Build & Usage Guide

This folder contains the signed, installable VyGo Android APKs produced from the
Capacitor project in `G:\PEROVIN\vygo\frontend\android`.

## Artifacts in this folder

| File | What it is |
|------|------------|
| `vygo.apk` | Signed release APK (installable alias) |
| `vygo-1.0.0-release.apk` | Same signed release APK, versioned name |
| `vygo-debug.apk` | Debug APK (for adb/logcat double-checking) |
| `release-keystore.jks` | Release signing keystore (do NOT lose this) |
| `keystore-credentials.txt` | Local working secret: keystore path, alias, storepass |

App identity: package `com.vygo.app`, versionName `1.0`, versionCode `1`,
minSdk 24, targetSdk 36.

---

## 1. Run the backend on the PC

The app talks to the VyGo Spring Boot backend on port `8080`.

```powershell
cd G:\PEROVIN\vygo\backend
java -jar target\vygo-backend-1.0.0.jar
```

The jar already exists (`G:\PEROVIN\vygo\backend\target\vygo-backend-1.0.0.jar`).
Spring Boot binds `0.0.0.0:8080` by default, so other devices on your LAN can
reach it. To confirm it is listening, run in a second terminal:

```powershell
netstat -ano | findstr :8080
```

You should see a `LISTENING` line for TCP `:8080`. To stop the backend, press
`Ctrl+C` in its terminal.

### If the jar is missing (rebuild with Maven)

Maven is available (`mvn -version` reports 3.9.16 at
`C:\Users\RRS~1.PRA\AppData\Local\opencode\tools\apache-maven-3.9.16`). Rebuild with:

```bash
cd backend
mvn -DskipTests package
```

This produces `target\vygo-backend-1.0.0.jar`.

---

## 2. Connect your phone

1. Find your PC's LAN IP (the phone and PC must be on the **same Wi-Fi**):
   ```powershell
   ipconfig
   ```
   Use the IPv4 of your active adapter (e.g. Wi-Fi / Ethernet).
   Example: the current machine reports `192.168.8.157` on the Wi-Fi adapter.
2. Start the backend (step 1) so the phone has something to talk to.
3. On the phone, allow installing apps from unknown sources:
   **Settings → Apps → Special access → Install unknown apps** (path varies by
   Android version/ROM) and allow "Install unknown apps" / your file manager.

## 4. Install the APK on the phone

Either:

- **Manual install:** transfer `vygo.apk` to the phone (USB cable, Google Drive,
  etc.), tap the file, confirm the install warning.
- **adb install** (USB debugging enabled on the phone):
  ```bash
  adb install -r vygo.apk
  ```
  (`adb` is in `G:\Android\sdk\platform-tools\adb.exe` if you need to add it to PATH.)

## 5. First run — connect to your server

1. Open the VyGo app.
2. It shows a **"Connect to your server"** screen.
3. Enter `http://<PC-LAN-IP>:8080` (e.g. `http://192.168.8.157:8080`).
4. Tap **Test** — it should confirm the backend is reachable.
5. Tap **Save & continue**.

> The app talks HTTP (not HTTPS) to a local IP, so the backend keeps cleartext
> traffic allowed and the Android app ships with
> `android:usesCleartextTraffic="true"` already set.

### Windows Firewall (if "Test" times out)

Allow inbound TCP 8080 once:

```powershell
netsh advfirewall firewall add rule name="VyGo Backend 8080" dir=in action=allow protocol=TCP localport=8080
```

## Test accounts (dev seed)

The backend seeds the following sample accounts on first start
(source: `backend\src\main\java\com\vygo\config\DataInitializer.java`).
**All of them use the password `password123`.**

| Role      | Email               | Mobile      | Notes                          |
|-----------|---------------------|-------------|--------------------------------|
| ADMIN     | `admin@vygo.lk`     | 0700000001  | System Administrator           |
| OPERATOR  | `operator@vygo.lk`  | 0700000002  | Lanka Express (approved)        |
| CONDUCTOR | `conductor@vygo.lk` | 0700000003  | Conductor Saman                 |
| PASSENGER | `nimal@vygo.lk`     | 0712345678  | Nimal Perera (has a demo booking) |
| OPERATOR  | `pending@vygo.lk`   | 0700000004  | Ceylon Travels (application PENDING) |

Use the PASSENGER account (`nimal@vygo.lk` / `password123`) to try booking, or
the ADMIN account to review operator applications.

## Troubleshooting

- **App shows connection error / timeout on "Test"**
  - Is the backend actually running? `netstat -ano | findstr :8080`.
  - Phone and PC **must be on the same network**.
  - Windows Firewall blocking inbound 8080 → add the rule above.
  - Wrong IP entered. Re-check `ipconfig`; use the IPv4, not `127.0.0.1`
    (that's the phone itself).

- **CORS errors**
  CORS already allows `https://localhost`, `capacitor://localhost` and
  `http://localhost` (see `backend\src\main\resources\application.yml`). If you
  set `VYGO_CORS_ORIGINS` yourself, make sure you keep
  `capacitor://localhost` in the list.

- **App install blocked**
  Enable "Install unknown apps" for the source you use, or switch to
  `adb install -r vygo.apk`.

- **Backend won't start**
  Check the terminal for a stack trace (e.g. port 8080 already in use — 
  free the port or change `server.port` in `application.yml`).

- **I lost the keystore / credentials**
  Copies of the signing store live here:
  `release-keystore.jks` + `keystore-credentials.txt`. Keep them safe — the
  same key is needed to update this app in the future (Android requires every
  update to be signed with the same key).

---

## Rebuilding a release APK (advanced)

Prereqs: Android SDK at `G:\Android\sdk`, JDK 21 (Zulu), built web assets.

```bash
# from G:\PEROVIN\vygo\frontend
npm run build
npx cap sync android

# from G:\PEROVIN\vygo\frontend\android
set VYGO_KEYSTORE=G:\PEROVIN\vygo\mobile\release-keystore.jks
set VYGO_STOREPASS=<from mobile\keystore-credentials.txt>
set VYGO_KEYALIAS=vygo
gradlew.bat assembleRelease
rem output: app\build\outputs\apk\release\app-release.apk
```

The signing config in `app\build.gradle` fails the build loudly instead of
producing an unsigned APK if any `VYGO_*` variable is unset.
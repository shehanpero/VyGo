# VyGo face verification service

Self-hosted, free face matching: it compares a driver/conductor's live **selfie**
against the portrait on their **ID document**. Everything runs on your own PC
(CPU only) — no third-party account and no per-check cost.

The Spring backend calls this service when `VYGO_FACE_ENABLED=true`. If the
service is not running, verification still works (admins review manually); it
just does not get an automatic face-match score.

## Run it

```bat
cd face-service
run.cmd
```

First run creates a Python virtual environment and installs dependencies. This
downloads **TensorFlow (~1 GB)** once, so allow a few minutes. The service then
listens on <http://localhost:8100>.

Verify it is up:

```bat
curl http://localhost:8100/health
```

## Enable it in the backend

Set these before starting the backend (see `.env.deploy.local`):

```
VYGO_FACE_ENABLED=true
VYGO_FACE_URL=http://localhost:8100
VYGO_FACE_MATCH_THRESHOLD=0.40
VYGO_FACE_REQUIRE_LIVENESS=true
```

When enabled, a driver/conductor submission is rejected unless:

- a face is detected in the selfie,
- a face is detected on the ID document, and
- the two faces match (`matched=true` from this service).

The client must also pass the on-screen **liveness** challenge (a blink).

## Endpoints

| Method | Path      | Body / result                                                        |
| ------ | --------- | ------------------------------------------------------------------- |
| GET    | `/health` | `{"status":"ok","model":"Facenet512","detector":"retinaface"}`       |
| POST   | `/match`  | `{"selfie":"<b64>","document":"<b64>"}` → face counts + score        |
| POST   | `/detect` | `{"document":"<b64>"}` → `{"faces": n, "boxes": [...]}`              |

## Configuration (environment variables)

| Variable             | Default       | Notes                                              |
| -------------------- | ------------- | -------------------------------------------------- |
| `VYGO_FACE_PORT`     | `8100`        | Listen port                                        |
| `VYGO_FACE_MODEL`    | `Facenet512`  | Any DeepFace model name                            |
| `VYGO_FACE_DETECTOR` | `retinaface`  | `retinaface`, `mtcnn`, `opencv`, `ssd`, `yunet`    |

> Accuracy note: this is a strong automated face match, but it is not a licensed
> KYC/identity verdict. Government-grade identity assurance requires a certified
> provider (Veriff, Onfido, Shufti Pro, …). Keep the admin review step for the
> final decision.

# Free full-system deployment

Target: one Render Free Node web service + one TiDB Cloud **MySQL-compatible Starter** free database. No existing POS records are to be imported; the user requested a fresh empty system.

The live service has **not** been created yet. Hosting account access and cloud database credentials are still required.

A clean upload package can be generated with `powershell -ExecutionPolicy Bypass -File scripts/prepare-deploy-package.ps1`. It creates `deployment-package/stn-motors-pos.zip` and a source directory, excluding local environment files, installed dependencies, historical Git data, generated builds and existing business records. Upload the source directory to a new private deployment repository.

## What is prepared

- `render.yaml` builds React and serves it with Express from one HTTPS origin. `/login`, `/pos`, and `/shop` use the same API/database.
- MySQL connections support certificate-verified TLS (`DB_SSL=true`).
- Startup creates the base schema, applies migrations, and creates the first production admin. Production excludes all demo users, products, customers and supplier records.
- Production requires a unique signing secret. Render generates this automatically.
- Images and bills are stored in the SQL database, rather than relying on Render's temporary local disk.

## Account setup and deployment

1. Sign in to GitHub, [Render](https://dashboard.render.com), and [TiDB Cloud](https://tidbcloud.com). Accept signup terms personally if requested.
2. Create a **free MySQL-compatible Starter** instance in TiDB, with paid scaling disabled. Create an empty database named `stn_motors`. Copy its connection details directly into the Render dashboard, not chat or committed files.
3. Publish a clean copy of the application source to a **private** GitHub repository. The existing working repository tracks `backend/.env` despite `.gitignore`; do not upload that file or reuse its history in a new deployment repository. Exclude `.git`, `.env` and `.env.*` (except `.env.example`), `node_modules`, generated builds, backups and database dumps. Keep `schema.sql`, lockfiles and `frontend/src` (backend permission helpers import shared frontend utilities).
4. Create a Render Blueprint from the private deployment repository using `render.yaml`. Confirm the service plan is **Free**, with no paid database or service attached.
5. Set these private values in Render:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: from TiDB connection settings.
   - `DB_PORT`: from TiDB, normally `4000`.
   - `BOOTSTRAP_ADMIN_EMAIL`: the owner's chosen login email.
   - `BOOTSTRAP_ADMIN_PASSWORD`: a new unique password of at least 12 characters.
   - Keep `DB_SSL=true`, `DB_CREATE_DATABASE=false`, `NODE_ENV=production`.
6. Deploy and verify `/api/health`, `/login`, `/pos`, `/products`, `/customers`, `/suppliers`, `/orders`, `/website` and `/shop`. The first admin is created only when there is no active admin. After successful setup, remove `BOOTSTRAP_ADMIN_PASSWORD` from Render environment settings; subsequent restarts retain the existing database account.
7. Add actual shop records through the admin UI. Verify a purchase, bill, return and stock update with disposable test records before relying on the online system for business.

## Costs and practical limits

- Render Free sleeps after 15 idle minutes; waking can take around a minute. Render itself recommends Free services for previews, rather than production business workloads. Monthly quotas may suspend service. See [Render Free limits](https://render.com/docs/free).
- TiDB MySQL-compatible Starter currently includes 5 GiB of row storage and 50 million monthly request units. Keep the instance on the free quota; reaching a limit can restrict usage. See [TiDB plan limits](https://docs.pingcap.com/tidbcloud/select-cluster-tier/).
- Free hosting cannot guarantee continuous availability for shop billing. Keep independent backups and a local fallback.
- SMS is currently a mock sender in this application. Hosting will not turn it into a paid SMS gateway. Browser invoice printing still requires a local printer; OCR assets are included in the build.

Never commit passwords, database dumps, API tokens or production signing secrets.

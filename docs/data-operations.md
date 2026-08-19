# Production Data Operations

LastBench production data belongs in PostgreSQL. The browser talks only to the
Express API; it never reads or writes Supabase tables directly.

## Guardrails

- `pnpm db:seed` is blocked when `NODE_ENV=production` because the demo seed resets data.
- Prisma migrations are the only supported way to change the production schema.
- The RLS migration enables Row Level Security on every application table without public policies. This blocks direct Supabase Data API access while preserving the API server's PostgreSQL connection.

## Apply a production migration

Run this from a trusted terminal with the production Supabase connection string
set as `DATABASE_URL`:

```powershell
pnpm --filter @lastbench/api exec prisma migrate deploy
```

Never run `prisma migrate reset` or `pnpm db:seed` against production.

## Create a backup

Install PostgreSQL client tools, then export the database to a folder outside
the repository. In PowerShell:

```powershell
$backupDir = Join-Path $env:USERPROFILE 'LastBenchBackups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
pg_dump --format=custom --no-owner --file "$backupDir\lastbench-$stamp.dump" $env:DATABASE_URL
```

Store a copy in a second location you control, such as encrypted cloud storage.
Take a backup before every migration and at least once a week while real users
are posting.

## Restore a backup

Restoring overwrites data. Create a fresh backup first, stop the API to prevent
writes, then run:

```powershell
pg_restore --clean --if-exists --no-owner --dbname $env:DATABASE_URL 'C:\path\to\lastbench-YYYY-MM-DD-HHMMSS.dump'
```

Restart the API and verify `GET /health/ready` plus a feed request afterward.

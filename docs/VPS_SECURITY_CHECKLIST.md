# VPS Security Checklist

Use this checklist before exposing TXAI Support on a VPS.

## Secrets

- Keep `.env`, `.env.local`, `backend/.env.local`, and any backup keys out of git.
- Rotate `ADMIN_DEFAULT_PASSWORD` after the first successful login.
- Use unique values for `POSTGRES_PASSWORD`, `JWT_SECRET`, `WPPCONNECT_SECRET_KEY`, and `WPPCONNECT_WEBHOOK_SECRET`.
- Never reuse development secrets in production.

## Network Exposure

- Expose only the public application ports required by the deployment.
- Keep PostgreSQL, Redis, and WPPConnect bound to `127.0.0.1` or Docker-internal networking.
- Do not open ports `5432`, `6379`, or `21465` to the internet.
- Restrict SSH to your IP when possible.

## Firewall Baseline

Recommended public ports:

- `22/tcp` only from your IP for SSH.
- `80/tcp` and `443/tcp` when a reverse proxy with TLS is configured.
- `8081/tcp`, `3001/tcp`, and `4443/tcp` only for temporary testing without a reverse proxy.

## Docker

- Use named Docker volumes for PostgreSQL and WPPConnect session data.
- Back up `postgres_data` before upgrades.
- Avoid running unrelated services on the same VPS.
- Keep Docker images updated intentionally, not automatically without testing.

## Application

- Set `PUBLIC_BASE_URL`, `PUBLIC_FRONTEND_URL`, `PUBLIC_GCS_URL`, and `PUBLIC_GCS_HOST` to the VPS domain/IP before building.
- Set `CORS_ORIGINS` to the exact frontend URL only.
- Use HTTPS before sharing the system outside your own network.
- Disable or protect any debug/admin endpoints before public use.

## Backups

- Schedule PostgreSQL dumps.
- Encrypt backups using `BACKUP_ENCRYPTION_KEY` or a managed secret outside the repository.
- Test restore at least once before relying on the backups.


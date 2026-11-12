# Togetherly — Backup & Disaster Recovery Runbook

*Last Updated: November 2026*

This runbook documents the disaster recovery, backup, and key rotation procedures for the Togetherly production backend and database.

---

## 1. Database Architecture & Snapshots

Togetherly runs on PostgreSQL with Prisma ORM.

### Automated Nightly Database Backups
```bash
# Automated cron job command (runs daily at 02:00 UTC)
pg_dump --format=custom --no-owner --clean --compress=9 \
  --dbname="${DATABASE_URL}" \
  --file="/backups/togetherly_db_$(date +\%Y\%m\%d_\%H\%M\%S).dump"
```

### Point-in-Time Recovery (PITR)
- Write-Ahead Logging (`wal_level = replica`) is enabled with WAL archiving to private S3 bucket.
- Retention policy: 30 days of continuous WAL segments and 90 days of daily compressed dumps.

---

## 2. Disaster Recovery Procedure

### Recovery Scenario: Complete Node / Database Loss
1. **Provision Fresh PostgreSQL Instance**:
   Ensure PostgreSQL version 15+ is installed with SSL required.
2. **Restore Latest Snapshot**:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname="${NEW_DATABASE_URL}" latest_backup.dump
   ```
3. **Run Prisma Migrations / Verification**:
   ```bash
   cd server
   npx prisma migrate deploy
   ```
4. **Health Check & Zero Test Users Verification**:
   ```bash
   npx tsx prisma/clean-test-users.ts
   npx tsx src/tests/mobile-e2e-test.ts
   ```

---

## 3. Cryptographic Key Security & Zero Plaintext Guarantees

1. **User Passwords**:
   Hashed with bcrypt (10 rounds). Passwords can never be recovered from database dumps. Password reset flows issue time-limited signed tokens.
2. **End-to-End Encryption Keys**:
   - Private keys are **never stored on the server** or backed up in server dumps.
   - Private keys reside strictly inside the user's on-device secure hardware enclave (`expo-secure-store`).
   - If a database breach occurs, ciphertext remains mathematically unreadable to attackers without partner hardware keys.
3. **Session Revocation**:
   Revoked sessions immediately invalidate active JWTs by matching against active `UserSession` records.

---

## 4. Emergency Contacts & Incident Escalation
- Infrastructure Engineering: `devops@togetherly.app`
- Security & Privacy Officer: `security@togetherly.app`


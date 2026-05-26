import { app } from './app';
import { pool } from './db/pool';
import { redis } from './lib/redis';
import { config } from './config';
import { applyDueAllUsers } from './modules/recurring/recurring.service';

async function start() {
  try {
    await redis.connect();
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis unavailable — rate limiting disabled');
  }

  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
    process.exit(1);
  }

  const server = app.listen(config.PORT, () => {
    console.log(`🚀 Server running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // ── Recurring-transactions scheduler ───────────────────────────────────
  // In-process hourly tick. Single-instance backend (the only deploy shape
  // we ship), so a global cron is overkill. Runs once a few seconds after
  // boot to catch overdue rows from downtime, then every hour.
  // SKIP in test runs to keep integration tests deterministic.
  let recurringTimer: NodeJS.Timeout | null = null;
  if (config.NODE_ENV !== 'test') {
    const tick = () => {
      applyDueAllUsers()
        .then((out) => {
          if (out.users > 0 || out.created > 0) {
            console.log(`[recurring] swept ${out.users} user(s), created ${out.created} tx`);
          }
        })
        .catch((e: unknown) => {
          console.error('[recurring] sweep failed', e);
        });
    };
    setTimeout(tick, 5_000);
    recurringTimer = setInterval(tick, 60 * 60 * 1000);
  }

  function shutdown(signal: string): void {
    console.log(`\n${signal} received — shutting down...`);
    if (recurringTimer) clearInterval(recurringTimer);
    server.close(() => {
      // Use void IIFE to run async cleanup inside the sync close callback
      void (async () => {
        await pool.end();
        await redis.quit();
        console.log('✅ Shutdown complete');
        process.exit(0);
      })();
    });
    // Force-kill after 10s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Top-level promise — catch is handled inside start() itself
void start();

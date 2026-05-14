import { app } from './app';
import { pool } from './db/pool';
import { redis } from './lib/redis';
import { config } from './config';

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

  function shutdown(signal: string): void {
    console.log(`\n${signal} received — shutting down...`);
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

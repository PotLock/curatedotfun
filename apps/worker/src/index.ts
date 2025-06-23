import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

// --- Middleware ---
app.use('*', logger());

app.post(
  '/process',
  zValidator('json',),
  async (c) => {
    // DO SOMETHING 
  }
);

const port = parseInt(process.env.PORT || '3002', 10);
console.log(`🟢 Bot Worker HTTP server listening on port ${port}...`);

export default {
  port: port,
  fetch: app.fetch,
};

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { accountsRouter } from './modules/accounts/accounts.router';
import { transactionsRouter } from './modules/transactions/transactions.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { budgetsRouter } from './modules/budgets/budgets.router';
import { reportsRouter } from './modules/reports/reports.router';
import { goalsRouter } from './modules/goals/goals.router';
import { recurringRouter } from './modules/recurring/recurring.router';

const app = express();

// Behind exactly one reverse proxy (nginx). Without this, req.ip is the
// proxy's address, collapsing every client into one rate-limit bucket and
// mis-recording X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── API docs ──────────────────────────────────────────────────────────────
// Load OpenAPI YAML once at boot — it's static text, no point re-reading.
// Path resolves from process.cwd(), which is backend/ in dev and /app in
// the Docker image (Dockerfile COPYs openapi/ alongside dist/). Failure
// to load shouldn't crash the server — docs are nice-to-have, not critical.
let openapiDoc: unknown = null;
try {
  const openapiYaml = readFileSync(resolve(process.cwd(), 'openapi/openapi.yaml'), 'utf-8');
  openapiDoc = YAML.parse(openapiYaml);
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapiDoc));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc as object, {
    customSiteTitle: 'Бабкосчёт API',
  }));
} catch (e) {
  console.warn('[openapi] spec not loaded — /api/v1/docs disabled', e instanceof Error ? e.message : e);
}

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/budgets', budgetsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/recurring', recurringRouter);

app.use(errorHandler);

export { app };

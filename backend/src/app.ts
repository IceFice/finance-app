import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { accountsRouter } from './modules/accounts/accounts.router';
import { transactionsRouter } from './modules/transactions/transactions.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { budgetsRouter } from './modules/budgets/budgets.router';
import { reportsRouter } from './modules/reports/reports.router';

const app = express();

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

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/budgets', budgetsRouter);
app.use('/api/v1/reports', reportsRouter);

app.use(errorHandler);

export { app };

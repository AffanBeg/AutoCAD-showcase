import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import { apiRouter } from './routes/index.js';

const app = express();

app.set('trust proxy', true);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

export { app };

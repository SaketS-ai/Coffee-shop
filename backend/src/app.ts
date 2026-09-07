import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { UPLOADS_DIR } from './middleware/upload';
import { apiRouter } from './routes';

export const app = express();

// In production only the configured CLIENT_URL is allowed. In local dev,
// any http://localhost:<port> origin is allowed too - Vite picks the next
// free port when its default is already taken by another running session,
// so pinning CORS to one exact port causes "failed to fetch" errors that
// have nothing to do with the app itself.
const localhostOriginPattern = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === env.clientUrl) {
        callback(null, true);
        return;
      }
      if (env.nodeEnv !== 'production' && localhostOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api', apiRouter);

// Must be registered last so it catches errors from every route above.
app.use(errorHandler);

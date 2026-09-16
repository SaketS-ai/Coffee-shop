import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { UPLOADS_DIR } from './middleware/upload';
import { apiRouter } from './routes';

export const app = express();

// High #5: Trust reverse proxy (ALB / CloudFront / Nginx) so client IP and protocol are preserved
if (env.trustProxy) {
  app.set('trust proxy', 1);
}

// High #4: Helmet security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
// crossOriginResourcePolicy: 'cross-origin' ensures images can be consumed by the frontend
// contentSecurityPolicy: false because this API returns JSON, not HTML pages
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// Medium #3: Configurable CORS supporting multiple origins (e.g. main domain + staging)
// In local dev, any http://localhost:<port> origin is allowed too.
const localhostOriginPattern = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (env.nodeEnv !== 'production' && localhostOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// In local development or fallback mode, serve disk-stored uploads
if (!env.awsS3Bucket || env.nodeEnv !== 'production') {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

app.use('/api', apiRouter);

// Forward root requests to the frontend client (e.g. when opening http://localhost:5000 in browser)
app.get('/', (req, res) => {
  const target = env.clientOrigins[0] || 'http://localhost:5173';
  res.redirect(target);
});

// Must be registered last so it catches errors from every route above.
app.use(errorHandler);


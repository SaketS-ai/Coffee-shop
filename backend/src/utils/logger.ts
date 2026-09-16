/* Structured production logger for AWS CloudWatch Insights + human-readable local dev logger */

function timestamp(): string {
  return new Date().toISOString();
}

function formatProductionLog(level: string, message: string, meta: unknown[]): string {
  const logObject: Record<string, unknown> = {
    timestamp: timestamp(),
    level,
    message,
  };

  if (meta.length > 0) {
    // If an Error object is passed, extract stack and message
    const formattedMeta = meta.map((m) => {
      if (m instanceof Error) {
        return {
          name: m.name,
          message: m.message,
          stack: m.stack,
        };
      }
      return m;
    });
    logObject.meta = formattedMeta.length === 1 ? formattedMeta[0] : formattedMeta;
  }

  return JSON.stringify(logObject);
}

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  info: (message: string, ...meta: unknown[]) => {
    if (isProduction) {
      console.log(formatProductionLog('INFO', message, meta));
    } else {
      console.log(`[${timestamp()}] INFO  ${message}`, ...meta);
    }
  },
  warn: (message: string, ...meta: unknown[]) => {
    if (isProduction) {
      console.warn(formatProductionLog('WARN', message, meta));
    } else {
      console.warn(`[${timestamp()}] WARN  ${message}`, ...meta);
    }
  },
  error: (message: string, ...meta: unknown[]) => {
    if (isProduction) {
      console.error(formatProductionLog('ERROR', message, meta));
    } else {
      console.error(`[${timestamp()}] ERROR ${message}`, ...meta);
    }
  },
};

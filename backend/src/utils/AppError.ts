/**
 * A known, expected failure with a client-safe message and the HTTP status
 * to send. Anything that is NOT an AppError is treated as unexpected by the
 * error handler and never has its details sent to the client.
 */
export class AppError extends Error {
  statusCode: number;
  reason?: string;

  constructor(statusCode: number, message: string, reason?: string) {
    super(message);
    this.statusCode = statusCode;
    this.reason = reason;
  }
}

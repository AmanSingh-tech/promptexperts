export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);

export function intInRange(value, min, max, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${field} must be an integer between ${min} and ${max}`);
  }
  return n;
}

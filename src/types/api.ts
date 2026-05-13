/**
 * Standard error response shape returned by every API route on failure.
 *
 * On success, routes return the resource directly (no envelope, no
 * `success: true`). On failure, they return this shape with the HTTP
 * status code carrying the error class (4xx = client, 5xx = server).
 *
 * Callers that need more than a message — e.g. Zod validation failure
 * details — populate `details` with a structured payload.
 */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

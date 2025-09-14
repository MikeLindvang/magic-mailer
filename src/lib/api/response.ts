/**
 * API Response utilities for consistent JSON responses
 * Provides compatibility for Response.json() across different environments
 */

export type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Create a JSON Response with proper headers and status
 * Provides compatibility for Response.json() method
 */
export function jsonResponse<T>(
  data: ApiResponse<T>,
  options: { status?: number } = {}
): Response {
  const { status = 200 } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success JSON response
 */
export function successResponse<T>(data: T, status = 200): Response {
  return jsonResponse({ ok: true, data }, { status });
}

/**
 * Create an error JSON response
 */
export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ ok: false, error }, { status });
}

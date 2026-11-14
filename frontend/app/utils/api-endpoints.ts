/**
 * Backend routes. Keep endpoint paths outside useApi so the HTTP client
 * remains generic and can be reused for any backend resource.
 */
export const API_ENDPOINTS = {
  kanji: '/api/public/kanji',
  grammar: '/api/public/grammar',
} as const

// CacheModule registers its cache under this stable Nest injection token.
// Keeping the token local prevents CommonJS Jest suites from loading the ESM-only package entrypoint.
export const DASHBOARD_CACHE_MANAGER = "CACHE_MANAGER";

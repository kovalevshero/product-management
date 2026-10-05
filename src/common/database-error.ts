export function hasDatabaseCode(error: unknown, code: string): boolean {
  const seen = new Set<unknown>();
  while (error && typeof error === 'object' && !seen.has(error)) {
    seen.add(error);
    if ('code' in error && error.code === code) return true;
    error = 'cause' in error ? error.cause : undefined;
  }
  return false;
}

/**
 * Write debug information to stderr when MUMBL_DEBUG=1
 */
export function debugLog(context: string, error: unknown): void {
  if (process.env['MUMBL_DEBUG'] !== '1') return;

  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[mumbl:${context}] ${message}\n`);
}

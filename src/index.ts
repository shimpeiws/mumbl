/**
 * mumbl - AI-powered communication tool
 */

export function main(): void {
  console.log('Hello, mumbl!');
}

// Only run main when executed directly (not imported for testing)
/* v8 ignore next 3 */
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

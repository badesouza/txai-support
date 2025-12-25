/**
 * Global Jest Teardown
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  const startedAt = process.env.TEST_STARTED_AT;
  const duration = startedAt 
    ? ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(2)
    : '?';

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   ✅ Test Suite Complete                                      ║');
  console.log(`║   ⏱️  Total Duration: ${duration}s`.padEnd(65) + '║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}



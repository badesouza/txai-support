/**
 * Global Jest Setup
 * Runs once before all test suites
 */

export default async function globalSetup() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🚀 TXAI Support - Test Suite                                ║');
  console.log('║                                                                ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                ║');
  
  const apiUrl = process.env.API_URL || 'http://localhost:3001/api';
  const isCloud = apiUrl.includes('run.app') || apiUrl.includes('.web.app');
  
  console.log(`║   📍 Target: ${isCloud ? '☁️  CLOUD' : '🏠 LOCAL'}`.padEnd(65) + '║');
  console.log(`║   🔗 API: ${apiUrl}`.padEnd(65).substring(0, 65) + '║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Store environment info for tests
  process.env.TEST_STARTED_AT = new Date().toISOString();
}




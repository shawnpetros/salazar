/**
 * Integration smoke test — imports the built mini-jwt library
 * and runs through a real-world agent identity scenario.
 */

import { generateKeyPair, sign, verify, decode } from './output/dist/index.js';

async function main() {
  console.log('\n🔑 Integration Test: mini-jwt library\n');

  // 1. Generate a key pair (like an Agent IdP would)
  console.log('1. Generating ES256 key pair...');
  const keys = await generateKeyPair();
  console.log('   ✓ Key pair generated');

  // 2. Sign a token (like issuing an agent identity)
  console.log('2. Signing a JWT for an AI agent...');
  const token = await sign({
    iss: 'https://idp.acme.com',
    sub: 'agent:code-review-bot',
    aud: 'https://api.github.com',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    iat: Math.floor(Date.now() / 1000),
    agent_type: 'assistant',
    agent_name: 'Code Review Bot',
    owner: 'acme-engineering',
    capabilities: ['read:repos', 'write:comments'],
  }, keys.privateKey);
  console.log(`   ✓ Token signed (${token.length} chars)`);
  console.log(`   Token: ${token.substring(0, 50)}...`);

  // 3. Decode without verification (for logging)
  console.log('3. Decoding token (no verification)...');
  const decoded = decode(token);
  console.log(`   ✓ Subject: ${decoded.sub}`);
  console.log(`   ✓ Issuer: ${decoded.iss}`);
  console.log(`   ✓ Agent: ${decoded.agent_name} (${decoded.agent_type})`);
  console.log(`   ✓ Capabilities: ${decoded.capabilities}`);

  // 4. Verify with the correct key (like a service validating the agent)
  console.log('4. Verifying token with correct public key...');
  const result = await verify(token, keys.publicKey);
  console.log(`   ✓ Valid: ${result.valid}`);
  console.log(`   ✓ Errors: ${result.errors.length === 0 ? 'none' : result.errors.join(', ')}`);

  // 5. Verify with wrong key (should fail)
  console.log('5. Verifying with WRONG key (should fail)...');
  const wrongKeys = await generateKeyPair();
  const badResult = await verify(token, wrongKeys.publicKey);
  console.log(`   ✓ Valid: ${badResult.valid} (expected: false)`);
  console.log(`   ✓ Errors: ${badResult.errors.join(', ')}`);

  // 6. Verify expired token
  console.log('6. Creating and verifying an expired token...');
  const expiredToken = await sign({
    iss: 'https://idp.acme.com',
    sub: 'agent:expired-bot',
    aud: 'https://api.github.com',
    exp: Math.floor(Date.now() / 1000) - 60, // expired 1 min ago
    iat: Math.floor(Date.now() / 1000) - 3600,
  }, keys.privateKey);
  const expiredResult = await verify(expiredToken, keys.publicKey);
  console.log(`   ✓ Valid: ${expiredResult.valid} (expected: false)`);
  console.log(`   ✓ Errors: ${expiredResult.errors.join(', ')}`);

  // 7. Audience enforcement
  console.log('7. Verifying with audience enforcement...');
  const audResult = await verify(token, keys.publicKey, { audience: 'https://api.github.com' });
  console.log(`   ✓ Correct audience — Valid: ${audResult.valid}`);
  const wrongAudResult = await verify(token, keys.publicKey, { audience: 'https://wrong.example.com' });
  console.log(`   ✓ Wrong audience — Valid: ${wrongAudResult.valid} (expected: false)`);

  // 8. Tampered token
  console.log('8. Verifying tampered token...');
  const parts = token.split('.');
  // Flip a character in the payload
  const tampered = parts[0] + '.' + parts[1].slice(0, -1) + 'X' + '.' + parts[2];
  const tamperedResult = await verify(tampered, keys.publicKey);
  console.log(`   ✓ Valid: ${tamperedResult.valid} (expected: false)`);

  // Summary
  const allPassed = (
    result.valid === true &&
    badResult.valid === false &&
    expiredResult.valid === false &&
    audResult.valid === true &&
    wrongAudResult.valid === false &&
    tamperedResult.valid === false
  );

  console.log(`\n${'='.repeat(50)}`);
  console.log(`${allPassed ? '✅' : '❌'} ALL INTEGRATION TESTS ${allPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`${'='.repeat(50)}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

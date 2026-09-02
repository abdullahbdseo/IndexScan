import test from 'node:test';
import assert from 'node:assert';
import { isPrivateOrReservedIP, validateSafeUrl } from '../lib/security/ssrf';

test('SSRF Protection - isPrivateOrReservedIP detects private and loopback IPv4', () => {
  // Loopback
  assert.strictEqual(isPrivateOrReservedIP('127.0.0.1'), true);
  assert.strictEqual(isPrivateOrReservedIP('127.1.2.3'), true);
  assert.strictEqual(isPrivateOrReservedIP('0.0.0.0'), true);

  // Private RFC 1918
  assert.strictEqual(isPrivateOrReservedIP('10.0.0.1'), true);
  assert.strictEqual(isPrivateOrReservedIP('10.255.255.254'), true);
  assert.strictEqual(isPrivateOrReservedIP('172.16.0.1'), true);
  assert.strictEqual(isPrivateOrReservedIP('172.31.255.254'), true);
  assert.strictEqual(isPrivateOrReservedIP('192.168.1.1'), true);
  assert.strictEqual(isPrivateOrReservedIP('192.168.100.254'), true);

  // Link Local / Cloud metadata
  assert.strictEqual(isPrivateOrReservedIP('169.254.169.254'), true);
  assert.strictEqual(isPrivateOrReservedIP('169.254.1.1'), true);

  // Public IPs
  assert.strictEqual(isPrivateOrReservedIP('8.8.8.8'), false);
  assert.strictEqual(isPrivateOrReservedIP('1.1.1.1'), false);
  assert.strictEqual(isPrivateOrReservedIP('142.250.190.46'), false);
});

test('SSRF Protection - isPrivateOrReservedIP detects private and loopback IPv6', () => {
  assert.strictEqual(isPrivateOrReservedIP('::1'), true);
  assert.strictEqual(isPrivateOrReservedIP('::'), true);
  assert.strictEqual(isPrivateOrReservedIP('fe80::1'), true);
  assert.strictEqual(isPrivateOrReservedIP('fc00::1'), true);
  assert.strictEqual(isPrivateOrReservedIP('fd12:3456:789a::1'), true);
});

test('SSRF Protection - validateSafeUrl blocks forbidden protocols and localhost', async () => {
  const badProtocols = ['ftp://example.com', 'file:///etc/passwd', 'data:text/html,test', 'javascript:alert(1)'];
  for (const p of badProtocols) {
    const res = await validateSafeUrl(p);
    assert.strictEqual(res.valid, false);
  }

  const badHosts = ['http://localhost', 'https://127.0.0.1', 'http://0.0.0.0:8000', 'https://169.254.169.254'];
  for (const h of badHosts) {
    const res = await validateSafeUrl(h);
    assert.strictEqual(res.valid, false);
  }
});

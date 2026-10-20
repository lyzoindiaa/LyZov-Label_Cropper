import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const lookupAsync = promisify(dns.lookup);

/**
 * Checks if an IP address is within private, loopback, or link-local ranges.
 */
function isPrivateIp(ip) {
  if (!ip) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-Local / Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 (Loopback)
    if (normalized === '::1') return true;
    // fe80::/10 (Link-Local)
    if (normalized.startsWith('fe80:')) return true;
    // fc00::/7 (Unique Local)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    return false;
  }

  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities.
 * @throws {Error} if URL is dangerous or points to private network
 */
export async function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    const err = new Error('URL is required.');
    err.code = 'INVALID_URL';
    throw err;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    const err = new Error('Invalid URL format. Must start with http:// or https://');
    err.code = 'INVALID_URL';
    throw err;
  }

  // Protocol scheme check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const err = new Error('Forbidden protocol. Only HTTP and HTTPS are permitted.');
    err.code = 'INVALID_URL';
    throw err;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname blocklist
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    const err = new Error('Access to local hostnames is strictly blocked.');
    err.code = 'BLOCKED';
    throw err;
  }

  // If host is already an IP, check directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      const err = new Error('Access to private/local IP addresses is strictly blocked.');
      err.code = 'BLOCKED';
      throw err;
    }
    return parsed.href;
  }

  // Resolve DNS to verify destination IP with safety timeout
  try {
    const dnsPromise = lookupAsync(hostname);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS_TIMEOUT')), 2000)
    );
    const { address } = await Promise.race([dnsPromise, timeoutPromise]);
    if (isPrivateIp(address)) {
      const err = new Error(`Resolved IP (${address}) is in a private network range.`);
      err.code = 'BLOCKED';
      throw err;
    }
  } catch (dnsErr) {
    if (dnsErr.code === 'BLOCKED') throw dnsErr;
    if (dnsErr.message !== 'DNS_TIMEOUT') {
      const err = new Error(`DNS resolution failed for host ${hostname}.`);
      err.code = 'INVALID_URL';
      throw err;
    }
    // If DNS resolution timed out on a valid public domain, proceed
  }

  return parsed.href;
}

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export interface SafeHttpResponse {
  ok: boolean;
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text(): Promise<string>;
}

interface SafeRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  allowedHosts?: string[];
}

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('ff') || normalized.startsWith('2001:db8:')) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
}

function isPrivateAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

async function resolvePublicAddress(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '');
  if (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost.endsWith('.local')
  ) {
    throw new BadRequestException('Les adresses locales ne sont pas autorisées.');
  }

  const addresses = await lookup(normalizedHost, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new BadRequestException(
      'Cette adresse pointe vers un réseau privé ou réservé et ne peut pas être utilisée.',
    );
  }

  return addresses[0];
}

function validateUrl(rawUrl: string, allowedHosts?: string[]) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException("L'adresse externe est invalide.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException("L'adresse doit utiliser HTTP ou HTTPS.");
  }
  if (url.username || url.password) {
    throw new BadRequestException("L'adresse ne doit pas contenir d'identifiants.");
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new BadRequestException("Le port de l'adresse externe n'est pas autorisé.");
  }
  if (
    allowedHosts?.length &&
    !allowedHosts.map((host) => host.toLowerCase()).includes(url.hostname.toLowerCase())
  ) {
    throw new BadRequestException("Le domaine de l'adresse externe n'est pas autorisé.");
  }

  return url;
}

async function requestOnce(url: URL, options: SafeRequestOptions) {
  const resolved = await resolvePublicAddress(url.hostname);
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }>((resolve, reject) => {
    const request = transport(
      {
        protocol: url.protocol,
        hostname: resolved.address,
        family: resolved.family,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        servername: url.protocol === 'https:' ? url.hostname : undefined,
        headers: {
          Host: url.host,
          ...options.headers,
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;

        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            request.destroy(
              new BadRequestException('La réponse externe dépasse la taille autorisée.'),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 502,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    request.setTimeout(options.timeoutMs ?? 15_000, () => {
      request.destroy(new ServiceUnavailableException('La requête externe a expiré.'));
    });
    request.on('error', reject);
    request.end();
  });
}

export async function safeGet(
  rawUrl: string,
  options: SafeRequestOptions = {},
): Promise<SafeHttpResponse> {
  let url = validateUrl(rawUrl, options.allowedHosts);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await requestOnce(url, options);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location || Array.isArray(location) || redirect === MAX_REDIRECTS) {
        throw new BadRequestException('La redirection externe est invalide ou excessive.');
      }
      url = validateUrl(new URL(location, url).toString(), options.allowedHosts);
      continue;
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: response.headers,
      async text() {
        return response.body;
      },
    };
  }

  throw new BadRequestException('Trop de redirections externes.');
}

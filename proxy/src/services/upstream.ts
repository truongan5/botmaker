import https from 'https';
import type { IncomingMessage } from 'http';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { VendorConfig } from '../types.js';

export interface UpstreamRequest {
  vendorConfig: VendorConfig;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
  apiKey: string;
}

export async function forwardToUpstream(
  req: UpstreamRequest,
  reply: FastifyReply
): Promise<number> {
  return new Promise((resolve, reject) => {
    const { vendorConfig, path, method, headers, body, apiKey } = req;

    // Build upstream path
    const upstreamPath = vendorConfig.basePath + path;

    // Clone and modify headers
    const upstreamHeaders: Record<string, string> = { ...headers };

    // Remove hop-by-hop headers
    delete upstreamHeaders['host'];
    delete upstreamHeaders['connection'];
    delete upstreamHeaders['authorization'];
    delete upstreamHeaders['content-length'];

    // Set correct host
    upstreamHeaders['host'] = vendorConfig.host;

    // Set auth header with real API key
    upstreamHeaders[vendorConfig.authHeader.toLowerCase()] = vendorConfig.authFormat(apiKey);

    // Set content-length if body present
    if (body) {
      upstreamHeaders['content-length'] = String(body.length);
    }

    const options = {
      hostname: vendorConfig.host,
      port: 443,
      path: upstreamPath,
      method,
      headers: upstreamHeaders,
    };

    const proxyReq = https.request(options, (proxyRes: IncomingMessage) => {
      const statusCode = proxyRes.statusCode ?? 500;

      // Forward status and headers
      reply.status(statusCode);

      // Forward response headers (excluding hop-by-hop)
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value && !['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      }

      // Stream the response body
      reply.send(proxyRes);
      resolve(statusCode);
    });

    proxyReq.on('error', (err) => {
      reject(err);
    });

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
}

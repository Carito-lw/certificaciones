import { auth } from "../../src/lib/auth/server";
import { readRawBody, getRequestURL, getRequestHeaders, getMethod } from "h3";

export default async function authMiddleware(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const url = getRequestURL(event);
  if (!url.pathname.startsWith("/api/auth")) {
    return next();
  }

  const method = getMethod(event, "GET").toUpperCase();
  const rawHeaders = getRequestHeaders(event);
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, String(value));
      }
    }
  }

  let bodyBuffer: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const raw = await readRawBody(event, false);
      if (raw) {
        bodyBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      }
    } catch {
      const req = event.node?.req || event.req;
      if (req && typeof req[Symbol.asyncIterator] === "function") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        bodyBuffer = Buffer.concat(chunks);
      }
    }
  }

  const request = new Request(url.href, {
    method,
    headers,
    body: bodyBuffer,
    // @ts-expect-error Node duplex
    duplex: bodyBuffer ? "half" : undefined,
  });

  return auth.handler(request);
}


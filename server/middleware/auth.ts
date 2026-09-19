import { auth } from "../../src/lib/auth/server";

interface NitroAuthEvent {
  url: URL;
  req: { method: string; headers: Headers; [key: string]: unknown };
}

export default async function authMiddleware(
  event: NitroAuthEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname;
  if (!path.startsWith("/api/auth")) {
    return next();
  }

  const method = (event.req.method ?? "GET").toUpperCase();
  const rawHeaders = event.req.headers;

  const request = new Request(event.url.toString(), {
    method,
    headers: rawHeaders,
  });

  return auth.handler(request);
}

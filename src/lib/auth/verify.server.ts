import { getRequest } from "@tanstack/react-start/server";
import { gateIdentityEnabled } from "./gate-identity.server";
import { auth, authConfigured } from "./server";

/**
 * Server-side session resolution (server-only).
 *
 * Valida sesiones y roles directamente desde las cookies del request o token Bearer.
 */

/** True when a real database is configured server-side. */
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/** Re-export so callers can branch on it without importing `server.ts`. */
export { authConfigured };

/** Dev fallback user id, used only when auth is disabled (VITE_AUTH_ENABLED=false). */
export const DEV_USER_ID = "dev-user";

/**
 * Thrown by `requireUserId` / `requireAdminSession` when the caller has no valid session.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type VerifiedUser = { id: string; email: string | null; role?: string };

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Resuelve el usuario de la sesión actual.
 */
export async function getSessionUser(
  bearerToken?: string,
): Promise<VerifiedUser | null> {
  const request = getRequest();
  if (!request) return null;
  let headers = request.headers;
  if (bearerToken) {
    headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      role: (session.user as { role?: string }).role || "admin",
    };
  } catch {
    return null;
  }
}

/**
 * Resuelve el usuario administrador autenticado o null.
 */
export async function getAdminSessionUser(
  bearerToken?: string,
): Promise<AdminSessionUser | null> {
  const request = getRequest();
  if (!request) return null;
  let headers = request.headers;
  if (bearerToken) {
    headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return null;
    const role = (session.user as { role?: string }).role || "admin";
    return {
      id: session.user.id,
      name: session.user.name || "Administrador",
      email: session.user.email || "",
      role,
    };
  } catch (err) {
    console.warn("getSession error in getAdminSessionUser:", err);
    return null;
  }
}

/**
 * Valida de forma estricta en el servidor que exista una sesión y que el rol sea 'admin'.
 * Lanza UnauthorizedError (401) o ForbiddenError (403).
 */
export async function requireAdminSession(bearerToken?: string): Promise<AdminSessionUser> {
  const admin = await getAdminSessionUser(bearerToken);
  if (!admin) {
    throw new UnauthorizedError();
  }
  if (admin.role !== "admin") {
    throw new ForbiddenError("Acceso no autorizado. Se requieren permisos de administrador.");
  }
  return admin;
}

export async function requireUserId(bearerToken?: string): Promise<string> {
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}

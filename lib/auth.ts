import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'wisdom-hub-jwt-secret-change-in-production'
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function verifyPassword(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return false;
  }
  return password === ADMIN_PASSWORD;
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    return false;
  }

  return verifyToken(token);
}

export async function requireAuth(): Promise<void> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error('Unauthorized');
  }
}

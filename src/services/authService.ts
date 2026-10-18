import bcrypt from "bcryptjs";
import { fail, ok, unwrap, type Result } from "./result";
import { getStore, newId, readRaw, users, writeJson } from "./storageService";
import { ready, records } from "./serviceUtils";
import { DEMO_NOTICE, STORAGE_KEYS, type AuthUser, type DemoSession, type StoredUser, type UserRole } from "./types";
import { demoSessionSchema, loginInputSchema, registerInputSchema, storedUserSchema, zodMessage } from "./validation";

export interface AuthRequest {
  name?: string;
  email: string;
  password: string;
  role?: "customer" | "admin";
}

function publicUser(user: StoredUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role === "ADMIN" ? "admin" : "customer" };
}

function loadUsers(): Result<StoredUser[]> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  return records(users, storedUserSchema);
}

function currentStoredSession(): Result<DemoSession | null> {
  const raw = readRaw(STORAGE_KEYS.session);
  if (raw.state === "missing") return ok(null);
  if (raw.state === "corrupt") return fail("STORAGE_CORRUPT", "The local demo session is invalid. Sign in again after clearing the session.");
  const parsed = demoSessionSchema.safeParse(raw.value);
  if (!parsed.success) return fail("STORAGE_CORRUPT", "The local demo session is invalid. Sign in again after clearing the session.");
  return ok(parsed.data);
}

export async function registerUser(input: AuthRequest): Promise<Result<AuthUser>> {
  const validated = registerInputSchema.safeParse(input);
  if (!validated.success) return fail("VALIDATION_ERROR", zodMessage(validated.error));
  if (validated.data.role === "ADMIN" || input.role === "admin") {
    return fail("ROLE_NOT_ALLOWED", "Public registration cannot create an ADMIN account.");
  }
  const loaded = loadUsers();
  if (!loaded.success) return loaded;
  const email = validated.data.email.toLowerCase();
  if (loaded.data.some((user) => user.email.toLowerCase() === email)) {
    return fail("EMAIL_IN_USE", "An account with this email address already exists.");
  }
  const stamp = new Date().toISOString();
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(validated.data.password, 10);
  } catch {
    return fail("PASSWORD_HASH_FAILED", "The demo password could not be hashed.");
  }
  const user: StoredUser = {
    id: newId(),
    name: validated.data.name,
    email,
    passwordHash,
    role: "CUSTOMER",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const saved = users.add(user);
  if (!saved.success) return saved;
  const sessionSaved = writeJson(STORAGE_KEYS.session, { token: newId(), userId: user.id, createdAt: stamp });
  if (!sessionSaved.success) {
    users.remove(user.id);
    return sessionSaved;
  }
  return ok(publicUser(user));
}

export async function loginUser(input: AuthRequest): Promise<Result<AuthUser>> {
  const validated = loginInputSchema.safeParse(input);
  if (!validated.success) return fail("VALIDATION_ERROR", zodMessage(validated.error));
  const loaded = loadUsers();
  if (!loaded.success) return loaded;
  const email = validated.data.email.toLowerCase();
  const user = loaded.data.find((entry) => entry.email.toLowerCase() === email);
  if (!user || !(await bcrypt.compare(validated.data.password, user.passwordHash))) {
    return fail("INVALID_CREDENTIALS", "The email or password is incorrect.");
  }
  const sessionSaved = writeJson(STORAGE_KEYS.session, {
    token: newId(),
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
  if (!sessionSaved.success) return sessionSaved;
  return ok(publicUser(user));
}

export function logoutUser(): Result<true> {
  try {
    getStore().removeItem(STORAGE_KEYS.session);
    return ok(true);
  } catch {
    return fail("STORAGE_UNAVAILABLE", "Browser storage is unavailable; the local session could not be cleared.");
  }
}

export function getCurrentUser(): Result<AuthUser | null> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const session = currentStoredSession();
  if (!session.success) return session;
  if (!session.data) return ok(null);
  const loaded = records(users, storedUserSchema);
  if (!loaded.success) return loaded;
  const user = loaded.data.find((entry) => entry.id === session.data?.userId);
  if (!user) {
    logoutUser();
    return ok(null);
  }
  return ok(publicUser(user));
}

export function updateUserProfile(input: { name?: string; email?: string }): Result<AuthUser> {
  const current = getCurrentUser();
  if (!current.success) return current;
  if (!current.data) return fail("AUTH_REQUIRED", "Sign in to update your profile.");
  const profileSchema = registerInputSchema.pick({ name: true, email: true }).partial();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success || (!parsed.data.name && !parsed.data.email)) {
    return fail("VALIDATION_ERROR", parsed.success ? "Provide a name or email to update." : zodMessage(parsed.error));
  }
  const loaded = records(users, storedUserSchema);
  if (!loaded.success) return loaded;
  const normalizedEmail = parsed.data.email?.toLowerCase();
  if (normalizedEmail && loaded.data.some((user) => user.id !== current.data?.id && user.email.toLowerCase() === normalizedEmail)) {
    return fail("EMAIL_IN_USE", "An account with this email address already exists.");
  }
  const updated = users.update(current.data.id, {
    ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    updatedAt: new Date().toISOString(),
  });
  if (!updated.success) return updated;
  return ok(publicUser(updated.data));
}

export function checkUserRole(role: UserRole): Result<boolean> {
  const current = getCurrentUser();
  if (!current.success) return current;
  return ok(current.data?.role === role);
}

export const authService = {
  async login(payload: AuthRequest) {
    const user = unwrap(await loginUser(payload));
    const session = currentStoredSession();
    if (!session.success || !session.data) throw new Error(session.success ? "The local session could not be created." : session.error.message);
    return { token: session.data.token, user };
  },
  async register(payload: AuthRequest) {
    const user = unwrap(await registerUser(payload));
    const session = currentStoredSession();
    if (!session.success || !session.data) throw new Error(session.success ? "The local session could not be created." : session.error.message);
    return { token: session.data.token, user };
  },
  async me() {
    const user = unwrap(getCurrentUser());
    if (!user) throw new Error("Sign in to continue.");
    return user;
  },
  logout() {
    unwrap(logoutUser());
  },
  current() {
    return unwrap(getCurrentUser());
  },
};

export { DEMO_NOTICE };
export type { AuthUser };

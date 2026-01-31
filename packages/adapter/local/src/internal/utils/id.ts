export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): Date {
  return new Date();
}

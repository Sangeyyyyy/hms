export function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = sanitizeText(value) as T[keyof T];
    }
  }
  return result;
}

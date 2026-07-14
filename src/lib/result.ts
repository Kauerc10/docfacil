/**
 * Result type — pattern funcional para tratamento de erros sem try/catch.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E };
export function ok<T>(data: T): Result<T, never> { return { ok: true, data }; }
export function fail<E>(error: E): Result<never, E> { return { ok: false, error }; }
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try { return ok(await fn()); } catch (error) { return fail(error instanceof Error ? error : new Error(String(error))); }
}
export function trySync<T>(fn: () => T): Result<T, Error> {
  try { return ok(fn()); } catch (error) { return fail(error instanceof Error ? error : new Error(String(error))); }
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

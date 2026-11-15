/**
 * RFC4122 v4 UUID using Math.random. Used only as an idempotency key for
 * client-generated farm ids; NOT security-sensitive.
 */
export function newUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

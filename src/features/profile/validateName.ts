/** Matches the producers.full_name DB check (1..120 chars). */
export const NAME_MAX = 120;

export type NameValidation = { value: string; error: string | null };

export function validateFullName(input: string): NameValidation {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length === 0) return { value, error: 'Informe seu nome.' };
  if (value.length > NAME_MAX) return { value, error: 'Nome muito longo.' };
  return { value, error: null };
}

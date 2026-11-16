import { UF_CODES } from '@/features/farm/ufs';
import { validateField, type FieldName } from '@/lib/security/fieldPolicies';

export type FarmField = 'name' | 'cep' | 'city' | 'state' | 'street' | 'neighborhood' | 'mainCrop';

export type FarmFormValues = {
  name: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  mainCrop: string;
};

export type FarmFormErrors = Partial<Record<FarmField, string>>;

export type FarmFormValidation = {
  valid: boolean;
  errors: FarmFormErrors;
  firstInvalid: FarmField | null;
};

export const FARM_FIELD_ORDER: FarmField[] = ['name', 'cep', 'city', 'state', 'street', 'neighborhood', 'mainCrop'];

const NAME_MAX = 120;
const CITY_MIN = 2;
const CITY_MAX = 80;
const STREET_MAX = 160;
const NEIGHBORHOOD_MAX = 120;
const CROP_MAX = 60;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Digits -> 00000-000 (max 8 digits). */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Allowlist + PII check for a non-empty value; returns the pt-BR error or null. */
function fieldError(field: FieldName, value: string): string | null {
  if (value.length === 0) return null;
  const r = validateField(field, value);
  return r.ok ? null : r.error;
}

export function validateFarmForm(values: FarmFormValues): FarmFormValidation {
  const name = values.name.trim();
  const city = values.city.trim();
  const state = values.state.trim();
  const street = values.street.trim();
  const neighborhood = values.neighborhood.trim();
  const mainCrop = values.mainCrop.trim();
  const errors: FarmFormErrors = {};

  if (name.length === 0) errors.name = 'Informe o nome da fazenda.';
  else if (name.length > NAME_MAX) errors.name = 'Nome muito longo.';

  if (onlyDigits(values.cep).length !== 8) errors.cep = 'Digite os 8 números do CEP.';

  if (city.length === 0) errors.city = 'Informe a cidade.';
  else if (city.length < CITY_MIN) errors.city = 'Cidade muito curta.';
  else if (city.length > CITY_MAX) errors.city = 'Cidade muito longa.';

  if (!UF_CODES.has(state)) errors.state = 'Selecione o estado.';

  if (street.length > STREET_MAX) errors.street = 'Endereço muito longo.';
  if (neighborhood.length > NEIGHBORHOOD_MAX) errors.neighborhood = 'Bairro muito longo.';
  if (mainCrop.length > CROP_MAX) errors.mainCrop = 'Cultura muito longa.';

  const checks: [FarmField, FieldName, string][] = [
    ['name', 'farmName', name],
    ['city', 'city', city],
    ['street', 'street', street],
    ['neighborhood', 'neighborhood', neighborhood],
    ['mainCrop', 'mainCrop', mainCrop],
  ];
  for (const [key, field, value] of checks) {
    if (errors[key]) continue;
    const err = fieldError(field, value);
    if (err) errors[key] = err;
  }

  const firstInvalid = FARM_FIELD_ORDER.find((f) => errors[f]) ?? null;
  return { valid: firstInvalid === null, errors, firstInvalid };
}

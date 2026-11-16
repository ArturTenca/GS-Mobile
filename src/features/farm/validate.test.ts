import { maskCep, onlyDigits, validateFarmForm } from '@/features/farm/validate';

const ok = {
  name: 'Fazenda Boa Vista',
  cep: '13500-000',
  street: 'Rua A',
  neighborhood: 'Centro',
  city: 'Rio Claro',
  state: 'SP',
  mainCrop: 'Milho',
};

describe('maskCep / onlyDigits', () => {
  it('masks progressively and caps at 8 digits', () => {
    expect(maskCep('135')).toBe('135');
    expect(maskCep('13500')).toBe('13500');
    expect(maskCep('135000')).toBe('13500-0');
    expect(maskCep('13500000999')).toBe('13500-000');
    expect(maskCep('13.500-000')).toBe('13500-000');
    expect(onlyDigits('13500-000')).toBe('13500000');
  });
});

describe('validateFarmForm', () => {
  it('accepts a valid form with a masked CEP and optional fields empty', () => {
    expect(validateFarmForm(ok).valid).toBe(true);
    expect(validateFarmForm({ ...ok, street: '', neighborhood: '', mainCrop: '' }).valid).toBe(true);
  });

  it('returns PT-BR messages and the first invalid in form order', () => {
    const r = validateFarmForm({ name: ' ', cep: '', street: '', neighborhood: '', city: '', state: '', mainCrop: '' });
    expect(r.errors).toEqual({
      name: 'Informe o nome da fazenda.',
      cep: 'Digite os 8 números do CEP.',
      city: 'Informe a cidade.',
      state: 'Selecione o estado.',
    });
    expect(r.firstInvalid).toBe('name');
  });

  it('rejects a 7-digit CEP', () => {
    expect(validateFarmForm({ ...ok, cep: '1234567' }).errors.cep).toBe('Digite os 8 números do CEP.');
  });

  it('enforces length limits', () => {
    expect(validateFarmForm({ ...ok, name: 'a'.repeat(121) }).errors.name).toBe('Nome muito longo.');
    expect(validateFarmForm({ ...ok, name: 'a'.repeat(120) }).valid).toBe(true);
    expect(validateFarmForm({ ...ok, city: 'a' }).errors.city).toBe('Cidade muito curta.');
    expect(validateFarmForm({ ...ok, city: 'a'.repeat(81) }).errors.city).toBe('Cidade muito longa.');
    expect(validateFarmForm({ ...ok, street: 'a'.repeat(161) }).errors.street).toBe('Endereço muito longo.');
    expect(validateFarmForm({ ...ok, neighborhood: 'a'.repeat(121) }).errors.neighborhood).toBe('Bairro muito longo.');
    expect(validateFarmForm({ ...ok, mainCrop: 'a'.repeat(61) }).errors.mainCrop).toBe('Cultura muito longa.');
  });

  it('rejects states outside the UF whitelist', () => {
    const r = validateFarmForm({ ...ok, state: 'XX' });
    expect(r.errors.state).toBe('Selecione o estado.');
    expect(r.firstInvalid).toBe('state');
  });
});

describe('validateFarmForm security', () => {
  const pii = 'Não coloque CPF, telefone ou outros dados pessoais neste campo.';
  it('blocks a phone number in the farm name', () => {
    expect(validateFarmForm({ ...ok, name: '11 99999-8888' }).errors.name).toBe(pii);
  });
  it('blocks e-mail in the street', () => {
    expect(validateFarmForm({ ...ok, street: 'a@b.com' }).errors.street).toBe(pii);
  });
  it('rejects markup/SQL characters', () => {
    const r = validateFarmForm({ ...ok, mainCrop: "x'; DROP TABLE a;--" });
    expect(r.errors.mainCrop).toBe('Use apenas letras, números e pontuação comum.');
  });
  it('accepts real-world names', () => {
    expect(validateFarmForm({ ...ok, name: 'Sítio São José – Km 12', street: 'R. 7 de Setembro, nº 45' }).valid).toBe(true);
  });
});

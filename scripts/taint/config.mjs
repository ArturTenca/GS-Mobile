// Tabelas declarativas do rastreador de taint (Fase 04.2, D-05).
// Fontes: onde um dado do usuario/servidor entra. Sinks: onde ele sai do app.
// Sanitizadores e guardas: chamadas que limpam ou bloqueiam o valor antes do sink.

// Fontes por nome de propriedade: `<base>.<prop>` onde base esta em bases e prop em props.
export const PROPERTY_SOURCES = [
  {
    id: 'form_field',
    label: 'campo de formulario (rua, cidade, nome, bairro, cultura, CEP)',
    bases: ['values', 'form', 'input', 'farm', 'address', 'data'],
    props: ['street', 'city', 'name', 'neighborhood', 'mainCrop', 'cep', 'postalcode', 'farmName'],
  },
  {
    id: 'auth_user',
    label: 'dado da conta (e-mail, nome completo)',
    bases: ['user', 'producer', 'profile', 'session'],
    props: ['email', 'fullName', 'full_name', 'name'],
  },
];

// Fontes por chamada (nome final do callee).
export const CALL_SOURCES = [
  { id: 'url_param', label: 'parametro de rota/URL', callees: ['useLocalSearchParams', 'useLinkingURL', 'getInitialURL'] },
];

// Fontes por forma: resposta HTTP (`x.json()`), erro capturado, resposta do Supabase.
export const SHAPE_SOURCES = {
  httpJson: { id: 'http_response', label: 'corpo de resposta HTTP (await response.json())' },
  caught: { id: 'caught_error', label: 'excecao capturada (catch)' },
  supabase: { id: 'db_response', label: 'resposta do Supabase (data/error)' },
  onChangeText: { id: 'onChangeText', label: 'texto digitado (onChangeText)' },
  coords: { id: 'geo_coords', label: 'coordenadas da propriedade', names: ['lat', 'lng', 'latitude', 'longitude'] },
  supabaseRoots: ['supabase'],
};

// Sanitizadores: o valor continua rastreado, mas o fluxo passa a status "sanitized".
export const SANITIZERS = [
  'sanitizeFreeText', 'sanitizeLiveInput', 'sanitizeTextField', 'sanitizeEmailInput', 'sanitizePasswordInput',
  'stripControlCharacters', 'stripInvisible', 'validateField', 'redact', 'redactDeep', 'onlyDigits',
  'roundCoord', 'assertCoarseCoord', 'sanitizeCause', 'Number', 'parseInt', 'parseFloat', 'Boolean',
  'encodeURIComponent',
];

// Guardas de sink: passam pela politica do sink e bloqueiam/mascaram. Status "blocked".
export const GUARDS = ['guardSink', 'unwrapFor', 'assertAllowedUrl'];

// Sinks de chamada: test(calleeText); args = indices verificados (null = todos).
export const SINKS = [
  { id: 'console', label: 'console.*', test: (t) => /^console\.\w+$/.test(t), args: null },
  { id: 'fetch', label: 'fetch(url, options)', test: (t) => t === 'fetch' || t === 'globalThis.fetch', args: [0, 1] },
  { id: 'open_url', label: 'Linking.openURL', test: (t) => t === 'Linking.openURL', args: [0] },
  { id: 'share', label: 'Share.share / Clipboard', test: (t) => /^(Share\.share|Clipboard\.setString(Async)?)$/.test(t), args: null },
  { id: 'push_message', label: 'buildMessage (push)', test: (t) => t === 'buildMessage', args: null },
  // safeLog redige os argumentos antes do console: guarda embutida.
  {
    id: 'console',
    label: 'safeLog(...) (console redigido)',
    test: (t) => t === 'safeLog',
    args: null,
    implicitGuard: { name: 'safeLog', kind: 'sanitized' },
  },
];

// new ServiceError(msg, cause): a causa so e segura se o construtor chama sanitizeCause.
export const NEW_SINKS = [
  {
    id: 'service_error',
    label: 'new ServiceError(msg, cause)',
    className: 'ServiceError',
    args: [1],
    requires: 'sanitizeCause(',
    guard: { name: 'ServiceError->sanitizeCause', kind: 'sanitized' },
  },
];

// Metodos que mutam o objeto base com o argumento (propagam taint para o base).
export const MUTATORS = ['push', 'unshift', 'set', 'append', 'add', 'assign'];

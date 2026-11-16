// Politica CSP da build web (documentada; entregue como cabecalho HTTP).
// EN: delivered as an HTTP response header by the hosting layer (Vercel, Netlify, Firebase
// Hosting, ...), not as an in-bundle meta tag: the web build is output "single" and Expo has
// no supported hook to inject a meta tag. pt-BR: configure o cabecalho Content-Security-Policy
// na hospedagem com o valor de WEB_CSP.
//
// Hosts conferidos no codigo: tiles/Leaflet em src/lib/mapTiles.ts, APIs em src/services,
// fontes empacotadas via expo-font (mesma origem / data:).
// script-src com 'unsafe-inline': o mapa usa um iframe srcDoc que herda esta politica e
// executa o script inline do Leaflet (src/components/map/mapHtml.ts). Sem eval.
// style-src com 'unsafe-inline': o React Native Web injeta estilos em tempo de execucao.

const DIRECTIVES: string[] = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://server.arcgisonline.com https://unpkg.com https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://brasilapi.com.br https://viacep.com.br https://nominatim.openstreetmap.org",
  "frame-src 'self' about:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

export const WEB_CSP: string = DIRECTIVES.join('; ');

export const WEB_CSP_NOTES =
  'Entregue WEB_CSP como cabecalho HTTP Content-Security-Policy na hospedagem (Vercel/Netlify/Firebase Hosting). ' +
  'Delivered as a hosting HTTP header, not an in-bundle meta tag (web build is output "single"). ' +
  "Nao ha como aplicar frame-ancestors via meta tag.";

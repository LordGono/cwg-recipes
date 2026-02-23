// ISO 3166-1 alpha-2 codes keyed by lowercase country name
const COUNTRY_CODES: Record<string, string> = {
  'afghanistan': 'AF',
  'argentina': 'AR',
  'australia': 'AU',
  'austria': 'AT',
  'belgium': 'BE',
  'brazil': 'BR',
  'canada': 'CA',
  'chile': 'CL',
  'china': 'CN',
  'colombia': 'CO',
  'croatia': 'HR',
  'cuba': 'CU',
  'denmark': 'DK',
  'egypt': 'EG',
  'ethiopia': 'ET',
  'finland': 'FI',
  'france': 'FR',
  'germany': 'DE',
  'ghana': 'GH',
  'greece': 'GR',
  'hungary': 'HU',
  'india': 'IN',
  'indonesia': 'ID',
  'iran': 'IR',
  'iraq': 'IQ',
  'ireland': 'IE',
  'israel': 'IL',
  'italy': 'IT',
  'jamaica': 'JM',
  'japan': 'JP',
  'jordan': 'JO',
  'kenya': 'KE',
  'korea': 'KR',
  'south korea': 'KR',
  'north korea': 'KP',
  'lebanon': 'LB',
  'malaysia': 'MY',
  'mexico': 'MX',
  'morocco': 'MA',
  'nepal': 'NP',
  'netherlands': 'NL',
  'new zealand': 'NZ',
  'nigeria': 'NG',
  'norway': 'NO',
  'pakistan': 'PK',
  'peru': 'PE',
  'philippines': 'PH',
  'poland': 'PL',
  'portugal': 'PT',
  'romania': 'RO',
  'russia': 'RU',
  'saudi arabia': 'SA',
  'senegal': 'SN',
  'singapore': 'SG',
  'south africa': 'ZA',
  'spain': 'ES',
  'sri lanka': 'LK',
  'sweden': 'SE',
  'switzerland': 'CH',
  'syria': 'SY',
  'taiwan': 'TW',
  'thailand': 'TH',
  'tunisia': 'TN',
  'turkey': 'TR',
  'ukraine': 'UA',
  'united kingdom': 'GB',
  'uk': 'GB',
  'united states': 'US',
  'usa': 'US',
  'us': 'US',
  'vietnam': 'VN',
  'yemen': 'YE',
};

/**
 * Returns a flag emoji for a given country name, or '' if not found.
 * Accepts full country names (case-insensitive).
 */
export function getCountryFlag(countryName: string): string {
  const code = COUNTRY_CODES[countryName.toLowerCase().trim()];
  if (!code || code.length !== 2) return '';
  return (
    String.fromCodePoint(0x1f1e0 + code.charCodeAt(0) - 65) +
    String.fromCodePoint(0x1f1e0 + code.charCodeAt(1) - 65)
  );
}

/** Title-cased country names for use in datalist autocomplete */
export const COUNTRY_NAMES: string[] = Object.keys(COUNTRY_CODES)
  .filter((k) => k === k.toLowerCase() && !['uk', 'usa', 'us'].includes(k))
  .map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
  .sort();

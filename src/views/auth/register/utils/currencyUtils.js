/**
 * Comprehensive list of world currencies
 * @returns {Array} Array of currency objects for react-select
 */
export const getCurrencyList = () => {
  return [
    // Americas
    { value: 'USD', label: 'USD - US Dollar', symbol: '$', region: 'Americas' },
    { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$', region: 'Americas' },
    { value: 'MXN', label: 'MXN - Mexican Peso', symbol: '$', region: 'Americas' },
    { value: 'BRL', label: 'BRL - Brazilian Real', symbol: 'R$', region: 'Americas' },
    { value: 'ARS', label: 'ARS - Argentine Peso', symbol: '$', region: 'Americas' },
    { value: 'CLP', label: 'CLP - Chilean Peso', symbol: '$', region: 'Americas' },
    { value: 'COP', label: 'COP - Colombian Peso', symbol: '$', region: 'Americas' },
    { value: 'PEN', label: 'PEN - Peruvian Sol', symbol: 'S/', region: 'Americas' },

    // Europe
    { value: 'EUR', label: 'EUR - Euro', symbol: '€', region: 'Europe' },
    { value: 'GBP', label: 'GBP - British Pound', symbol: '£', region: 'Europe' },
    { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'Fr', region: 'Europe' },
    { value: 'NOK', label: 'NOK - Norwegian Krone', symbol: 'kr', region: 'Europe' },
    { value: 'SEK', label: 'SEK - Swedish Krona', symbol: 'kr', region: 'Europe' },
    { value: 'DKK', label: 'DKK - Danish Krone', symbol: 'kr', region: 'Europe' },
    { value: 'PLN', label: 'PLN - Polish Zloty', symbol: 'zł', region: 'Europe' },
    { value: 'CZK', label: 'CZK - Czech Koruna', symbol: 'Kč', region: 'Europe' },
    { value: 'HUF', label: 'HUF - Hungarian Forint', symbol: 'Ft', region: 'Europe' },
    { value: 'RON', label: 'RON - Romanian Leu', symbol: 'lei', region: 'Europe' },
    { value: 'BGN', label: 'BGN - Bulgarian Lev', symbol: 'лв', region: 'Europe' },
    { value: 'TRY', label: 'TRY - Turkish Lira', symbol: '₺', region: 'Europe' },
    { value: 'RUB', label: 'RUB - Russian Ruble', symbol: '₽', region: 'Europe' },
    { value: 'UAH', label: 'UAH - Ukrainian Hryvnia', symbol: '₴', region: 'Europe' },

    // Asia-Pacific
    { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥', region: 'Asia' },
    { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥', region: 'Asia' },
    { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹', region: 'Asia' },
    { value: 'KRW', label: 'KRW - South Korean Won', symbol: '₩', region: 'Asia' },
    { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$', region: 'Asia' },
    { value: 'HKD', label: 'HKD - Hong Kong Dollar', symbol: 'HK$', region: 'Asia' },
    { value: 'TWD', label: 'TWD - Taiwan Dollar', symbol: 'NT$', region: 'Asia' },
    { value: 'THB', label: 'THB - Thai Baht', symbol: '฿', region: 'Asia' },
    { value: 'MYR', label: 'MYR - Malaysian Ringgit', symbol: 'RM', region: 'Asia' },
    { value: 'IDR', label: 'IDR - Indonesian Rupiah', symbol: 'Rp', region: 'Asia' },
    { value: 'PHP', label: 'PHP - Philippine Peso', symbol: '₱', region: 'Asia' },
    { value: 'VND', label: 'VND - Vietnamese Dong', symbol: '₫', region: 'Asia' },
    { value: 'PKR', label: 'PKR - Pakistani Rupee', symbol: '₨', region: 'Asia' },
    { value: 'BDT', label: 'BDT - Bangladeshi Taka', symbol: '৳', region: 'Asia' },
    { value: 'LKR', label: 'LKR - Sri Lankan Rupee', symbol: 'Rs', region: 'Asia' },
    { value: 'NPR', label: 'NPR - Nepalese Rupee', symbol: 'Rs', region: 'Asia' },

    // Oceania
    { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$', region: 'Oceania' },
    { value: 'NZD', label: 'NZD - New Zealand Dollar', symbol: 'NZ$', region: 'Oceania' },

    // Middle East
    { value: 'AED', label: 'AED - UAE Dirham', symbol: 'د.إ', region: 'Middle East' },
    { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: '﷼', region: 'Middle East' },
    { value: 'QAR', label: 'QAR - Qatari Riyal', symbol: '﷼', region: 'Middle East' },
    { value: 'KWD', label: 'KWD - Kuwaiti Dinar', symbol: 'د.ك', region: 'Middle East' },
    { value: 'BHD', label: 'BHD - Bahraini Dinar', symbol: 'د.ب', region: 'Middle East' },
    { value: 'OMR', label: 'OMR - Omani Rial', symbol: '﷼', region: 'Middle East' },
    { value: 'ILS', label: 'ILS - Israeli Shekel', symbol: '₪', region: 'Middle East' },
    { value: 'JOD', label: 'JOD - Jordanian Dinar', symbol: 'د.ا', region: 'Middle East' },
    { value: 'LBP', label: 'LBP - Lebanese Pound', symbol: 'ل.ل', region: 'Middle East' },

    // Africa
    { value: 'ZAR', label: 'ZAR - South African Rand', symbol: 'R', region: 'Africa' },
    { value: 'NGN', label: 'NGN - Nigerian Naira', symbol: '₦', region: 'Africa' },
    { value: 'EGP', label: 'EGP - Egyptian Pound', symbol: '£', region: 'Africa' },
    { value: 'KES', label: 'KES - Kenyan Shilling', symbol: 'KSh', region: 'Africa' },
    { value: 'GHS', label: 'GHS - Ghanaian Cedi', symbol: '₵', region: 'Africa' },
    { value: 'TZS', label: 'TZS - Tanzanian Shilling', symbol: 'TSh', region: 'Africa' },
    { value: 'UGX', label: 'UGX - Ugandan Shilling', symbol: 'USh', region: 'Africa' },
    { value: 'MAD', label: 'MAD - Moroccan Dirham', symbol: 'د.م.', region: 'Africa' },
    { value: 'ETB', label: 'ETB - Ethiopian Birr', symbol: 'Br', region: 'Africa' },
  ].sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Map country codes to their primary currencies
 */
const countryToCurrencyMap = {
  // Americas
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  VE: 'VES', UY: 'UYU', PY: 'PYG', BO: 'BOB', EC: 'USD', CR: 'CRC', PA: 'USD',
  GT: 'GTQ', HN: 'HNL', SV: 'USD', NI: 'NIO', DO: 'DOP', CU: 'CUP', JM: 'JMD',
  TT: 'TTD', BS: 'BSD', BB: 'BBD', GY: 'GYD', SR: 'SRD', BZ: 'BZD', HT: 'HTG',

  // Europe
  AT: 'EUR', BE: 'EUR', BG: 'BGN', HR: 'EUR', CY: 'EUR', CZ: 'CZK', DK: 'DKK',
  EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR', GR: 'EUR', HU: 'HUF', IE: 'EUR',
  IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR', PL: 'PLN',
  PT: 'EUR', RO: 'RON', SK: 'EUR', SI: 'EUR', ES: 'EUR', SE: 'SEK', GB: 'GBP',
  CH: 'CHF', NO: 'NOK', IS: 'ISK', RU: 'RUB', UA: 'UAH', BY: 'BYN', MD: 'MDL',
  RS: 'RSD', BA: 'BAM', MK: 'MKD', AL: 'ALL', ME: 'EUR', TR: 'TRY', GE: 'GEL',

  // Asia-Pacific
  CN: 'CNY', JP: 'JPY', IN: 'INR', KR: 'KRW', SG: 'SGD', HK: 'HKD', TW: 'TWD',
  TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR', LA: 'LAK', MN: 'MNT', BN: 'BND',
  MV: 'MVR', BT: 'BTN', AF: 'AFN', KZ: 'KZT', UZ: 'UZS', TJ: 'TJS', KG: 'KGS',
  TM: 'TMT', AM: 'AMD', AZ: 'AZN',

  // Oceania
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK', NC: 'XPF', PF: 'XPF', WS: 'WST',
  TO: 'TOP', VU: 'VUV', SB: 'SBD', KI: 'AUD', TV: 'AUD', NR: 'AUD',

  // Middle East
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', IL: 'ILS',
  JO: 'JOD', LB: 'LBP', SY: 'SYP', IQ: 'IQD', IR: 'IRR', YE: 'YER', PS: 'ILS',

  // Africa
  ZA: 'ZAR', NG: 'NGN', EG: 'EGP', KE: 'KES', GH: 'GHS', TZ: 'TZS', UG: 'UGX',
  MA: 'MAD', ET: 'ETB', DZ: 'DZD', AO: 'AOA', SD: 'SDG', TN: 'TND', LY: 'LYD',
  CM: 'XAF', CI: 'XOF', SN: 'XOF', ZW: 'ZWL', ZM: 'ZMW', MW: 'MWK', MZ: 'MZN',
  BW: 'BWP', NA: 'NAD', MU: 'MUR', RW: 'RWF', MG: 'MGA', SC: 'SCR', SO: 'SOS',
};

/**
 * Get currency based on country code
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {string|null} Currency code or null
 */
export const getCurrencyByCountry = (countryCode) => {
  return countryToCurrencyMap[countryCode] || null;
};

/**
 * Get currency object from currency code
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {object|null} Currency object or null if not found
 */
export const getCurrencyByCode = (currencyCode) => {
  const currencyList = getCurrencyList();
  return currencyList.find(currency => currency.value === currencyCode) || null;
};

/**
 * Auto-detect currency based on country
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {object} Currency object
 */
export const autoDetectCurrency = (countryCode) => {
  const currencyCode = getCurrencyByCountry(countryCode);
  if (currencyCode) {
    const currency = getCurrencyByCode(currencyCode);
    if (currency) {
      return currency;
    }
  }
  // Default to USD if not found
  return getCurrencyByCode('USD');
};

/**
 * Format currency display with symbol
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode) => {
  const currency = getCurrencyByCode(currencyCode);
  if (currency) {
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
  return `${currencyCode} ${amount.toFixed(2)}`;
};

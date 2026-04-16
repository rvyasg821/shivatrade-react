import countries from 'world-countries';

/**
 * Get list of all countries with relevant data
 * @returns {Array} Array of country objects for react-select
 */
export const getCountryList = () => {
  return countries
    .map((country) => ({
      value: country.cca2, // ISO 3166-1 alpha-2 code
      label: country.name.common,
      flag: country.flag,
      code: country.cca2,
      dialCode: country.idd.root + (country.idd.suffixes?.[0] || ''),
      timezones: country.timezones,
      region: country.region,
      subregion: country.subregion,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get comprehensive list of timezones grouped by region
 * @returns {Array} Array of timezone objects for react-select
 */
export const getTimezoneList = () => {
  // Common timezones with user-friendly labels
  const timezones = [
    // Americas
    { value: 'America/New_York', label: '(GMT-5:00) Eastern Time - New York', region: 'Americas', offset: -5 },
    { value: 'America/Chicago', label: '(GMT-6:00) Central Time - Chicago', region: 'Americas', offset: -6 },
    { value: 'America/Denver', label: '(GMT-7:00) Mountain Time - Denver', region: 'Americas', offset: -7 },
    { value: 'America/Phoenix', label: '(GMT-7:00) Mountain Time (no DST) - Phoenix', region: 'Americas', offset: -7 },
    { value: 'America/Los_Angeles', label: '(GMT-8:00) Pacific Time - Los Angeles', region: 'Americas', offset: -8 },
    { value: 'America/Anchorage', label: '(GMT-9:00) Alaska Time - Anchorage', region: 'Americas', offset: -9 },
    { value: 'Pacific/Honolulu', label: '(GMT-10:00) Hawaii Time - Honolulu', region: 'Pacific', offset: -10 },
    { value: 'America/Toronto', label: '(GMT-5:00) Eastern Time - Toronto', region: 'Americas', offset: -5 },
    { value: 'America/Vancouver', label: '(GMT-8:00) Pacific Time - Vancouver', region: 'Americas', offset: -8 },
    { value: 'America/Mexico_City', label: '(GMT-6:00) Central Time - Mexico City', region: 'Americas', offset: -6 },
    { value: 'America/Sao_Paulo', label: '(GMT-3:00) Brasilia Time - São Paulo', region: 'Americas', offset: -3 },
    { value: 'America/Argentina/Buenos_Aires', label: '(GMT-3:00) Argentina Time - Buenos Aires', region: 'Americas', offset: -3 },

    // Europe
    { value: 'Europe/London', label: '(GMT+0:00) Greenwich Mean Time - London', region: 'Europe', offset: 0 },
    { value: 'Europe/Paris', label: '(GMT+1:00) Central European Time - Paris', region: 'Europe', offset: 1 },
    { value: 'Europe/Berlin', label: '(GMT+1:00) Central European Time - Berlin', region: 'Europe', offset: 1 },
    { value: 'Europe/Rome', label: '(GMT+1:00) Central European Time - Rome', region: 'Europe', offset: 1 },
    { value: 'Europe/Madrid', label: '(GMT+1:00) Central European Time - Madrid', region: 'Europe', offset: 1 },
    { value: 'Europe/Amsterdam', label: '(GMT+1:00) Central European Time - Amsterdam', region: 'Europe', offset: 1 },
    { value: 'Europe/Brussels', label: '(GMT+1:00) Central European Time - Brussels', region: 'Europe', offset: 1 },
    { value: 'Europe/Warsaw', label: '(GMT+1:00) Central European Time - Warsaw', region: 'Europe', offset: 1 },
    { value: 'Europe/Athens', label: '(GMT+2:00) Eastern European Time - Athens', region: 'Europe', offset: 2 },
    { value: 'Europe/Istanbul', label: '(GMT+3:00) Turkey Time - Istanbul', region: 'Europe', offset: 3 },
    { value: 'Europe/Moscow', label: '(GMT+3:00) Moscow Time - Moscow', region: 'Europe', offset: 3 },

    // Asia
    { value: 'Asia/Dubai', label: '(GMT+4:00) Gulf Time - Dubai', region: 'Asia', offset: 4 },
    { value: 'Asia/Karachi', label: '(GMT+5:00) Pakistan Time - Karachi', region: 'Asia', offset: 5 },
    { value: 'Asia/Kolkata', label: '(GMT+5:30) India Standard Time - Kolkata', region: 'Asia', offset: 5.5 },
    { value: 'Asia/Dhaka', label: '(GMT+6:00) Bangladesh Time - Dhaka', region: 'Asia', offset: 6 },
    { value: 'Asia/Bangkok', label: '(GMT+7:00) Indochina Time - Bangkok', region: 'Asia', offset: 7 },
    { value: 'Asia/Singapore', label: '(GMT+8:00) Singapore Time - Singapore', region: 'Asia', offset: 8 },
    { value: 'Asia/Hong_Kong', label: '(GMT+8:00) Hong Kong Time - Hong Kong', region: 'Asia', offset: 8 },
    { value: 'Asia/Shanghai', label: '(GMT+8:00) China Standard Time - Shanghai', region: 'Asia', offset: 8 },
    { value: 'Asia/Tokyo', label: '(GMT+9:00) Japan Standard Time - Tokyo', region: 'Asia', offset: 9 },
    { value: 'Asia/Seoul', label: '(GMT+9:00) Korea Standard Time - Seoul', region: 'Asia', offset: 9 },

    // Australia & Pacific
    { value: 'Australia/Sydney', label: '(GMT+10:00) Australian Eastern Time - Sydney', region: 'Australia', offset: 10 },
    { value: 'Australia/Melbourne', label: '(GMT+10:00) Australian Eastern Time - Melbourne', region: 'Australia', offset: 10 },
    { value: 'Australia/Brisbane', label: '(GMT+10:00) Australian Eastern Time (no DST) - Brisbane', region: 'Australia', offset: 10 },
    { value: 'Australia/Perth', label: '(GMT+8:00) Australian Western Time - Perth', region: 'Australia', offset: 8 },
    { value: 'Pacific/Auckland', label: '(GMT+12:00) New Zealand Time - Auckland', region: 'Pacific', offset: 12 },

    // Africa
    { value: 'Africa/Cairo', label: '(GMT+2:00) Eastern European Time - Cairo', region: 'Africa', offset: 2 },
    { value: 'Africa/Johannesburg', label: '(GMT+2:00) South Africa Time - Johannesburg', region: 'Africa', offset: 2 },
    { value: 'Africa/Lagos', label: '(GMT+1:00) West Africa Time - Lagos', region: 'Africa', offset: 1 },
    { value: 'Africa/Nairobi', label: '(GMT+3:00) East Africa Time - Nairobi', region: 'Africa', offset: 3 },

    // Middle East
    { value: 'Asia/Jerusalem', label: '(GMT+2:00) Israel Time - Jerusalem', region: 'Asia', offset: 2 },
    { value: 'Asia/Riyadh', label: '(GMT+3:00) Arabia Time - Riyadh', region: 'Asia', offset: 3 },
  ];

  return timezones.sort((a, b) => a.offset - b.offset);
};

/**
 * Auto-detect user's timezone using browser API
 * @returns {string} IANA timezone identifier (e.g., "America/New_York")
 */
export const detectUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'America/New_York'; // Fallback
  }
};

/**
 * Get timezone object from timezone value
 * @param {string} timezoneValue - IANA timezone identifier
 * @returns {object|null} Timezone object or null if not found
 */
export const getTimezoneByValue = (timezoneValue) => {
  const timezones = getTimezoneList();
  return timezones.find(tz => tz.value === timezoneValue) || null;
};

/**
 * Attempt to detect user's country based on timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {string|null} Country code or null
 */
export const guessCountryFromTimezone = (timezone) => {
  const timezoneToCountry = {
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Phoenix': 'US',
    'America/Los_Angeles': 'US',
    'America/Anchorage': 'US',
    'Pacific/Honolulu': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT',
    'Europe/Madrid': 'ES',
    'Europe/Amsterdam': 'NL',
    'Asia/Kolkata': 'IN',
    'Asia/Dubai': 'AE',
    'Asia/Singapore': 'SG',
    'Asia/Tokyo': 'JP',
    'Australia/Sydney': 'AU',
    // Add more mappings as needed
  };

  return timezoneToCountry[timezone] || null;
};

/**
 * Get country object from country code
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {object|null} Country object or null if not found
 */
export const getCountryByCode = (countryCode) => {
  const countryList = getCountryList();
  return countryList.find(country => country.code === countryCode) || null;
};

/**
 * Country to primary timezone mapping for accurate timezone detection
 */
const countryToPrimaryTimezone = {
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  UK: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  PL: 'Europe/Warsaw',
  GR: 'Europe/Athens',
  TR: 'Europe/Istanbul',
  RU: 'Europe/Moscow',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  IL: 'Asia/Jerusalem',
  SG: 'Asia/Singapore',
  HK: 'Asia/Hong_Kong',
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  TH: 'Asia/Bangkok',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  BR: 'America/Sao_Paulo',
  AR: 'America/Argentina/Buenos_Aires',
  MX: 'America/Mexico_City',
  ZA: 'Africa/Johannesburg',
  EG: 'Africa/Cairo',
  NG: 'Africa/Lagos',
  KE: 'Africa/Nairobi',
};

/**
 * Get primary timezone for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {string|null} Timezone identifier or null
 */
export const getPrimaryTimezoneByCountry = (countryCode) => {
  // First check our curated mapping
  const mappedTimezone = countryToPrimaryTimezone[countryCode?.toUpperCase()];
  if (mappedTimezone) {
    return mappedTimezone;
  }

  // Fallback to country data
  const country = getCountryByCode(countryCode);
  if (!country || !country.timezones || country.timezones.length === 0) {
    return null;
  }

  // Get the first timezone from the country's timezone list
  const primaryTimezone = country.timezones[0];

  // Try to find a matching timezone in our curated list
  const timezoneList = getTimezoneList();
  const matchingTimezone = timezoneList.find(tz => tz.value === primaryTimezone);

  if (matchingTimezone) {
    return matchingTimezone.value;
  }

  // If no exact match, return the first timezone from the country
  return primaryTimezone;
};

/**
 * Detect user's country using IP-based geolocation
 * This is a fallback method and requires an external API
 * @returns {Promise<string|null>} Country code or null
 */
export const detectUserCountryByIP = async () => {
  try {
    // Using a free geolocation API (you can replace with your preferred service)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || null;
  } catch (error) {
    console.error('Error detecting country by IP:', error);
    return null;
  }
};

/**
 * Auto-detect both country and timezone
 * @returns {Promise<object>} Object with country and timezone
 */
export const autoDetectCountryAndTimezone = async () => {
  // Detect timezone first (always works)
  const timezone = detectUserTimezone();

  // Try to guess country from timezone
  let countryCode = guessCountryFromTimezone(timezone);

  // If timezone guess fails, try IP-based detection
  if (!countryCode) {
    countryCode = await detectUserCountryByIP();
  }

  // Fallback to GB if all detection methods fail
  if (!countryCode) {
    countryCode = 'GB';
  }

  const country = getCountryByCode(countryCode);
  const timezoneObj = getTimezoneByValue(timezone);

  return {
    country: country || getCountryByCode('GB'),
    timezone: timezoneObj || getTimezoneList()[0],
    detectedTimezone: timezone,
  };
};

/**
 * Format options for react-select with custom styling
 * @param {object} option - Option object
 * @returns {JSX.Element} Formatted option
 */
export const formatCountryOption = (option) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.2em' }}>{option.flag}</span>
      <span>{option.label}</span>
    </div>
  );
};

/**
 * Custom styles for react-select (country and timezone)
 */
export const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#7367f0' : '#ddd',
    boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(115, 103, 240, 0.25)' : 'none',
    '&:hover': {
      borderColor: '#7367f0',
    },
    minHeight: '40px',
    borderRadius: '6px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#7367f0' : state.isFocused ? 'rgba(115, 103, 240, 0.1)' : 'white',
    color: state.isSelected ? 'white' : '#495057',
    '&:hover': {
      backgroundColor: state.isSelected ? '#7367f0' : 'rgba(115, 103, 240, 0.1)',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#495057',
  }),
};

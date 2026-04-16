import {
  roleBypassType,
  rolePermissionJson,
  storageUserKeyName,
  storageTokenKeyName,
  storageCustomerToken,
  storageContractorToken,
  storageRefreshTokenKeyName,
  appsRoot
} from "@constant/defaultValues";

import { DefaultRoute } from "../router/routes";

// ** Thrid Party library
import moment from "moment";
// import { parsePhoneNumberFromString } from 'libphonenumber-js';

// ** Default Avatar Image
import defaultAvatar from "@src/assets/images/avatars/avatar.jpeg";


// ** Checks if an object is empty (returns boolean)
const isObjEmpty = (obj) => Object.keys(obj).length === 0;

// ** Returns K format from a number
const kFormatter = (num) => (num > 999 ? `${(num / 1000).toFixed(1)}k` : num);

// ** Converts HTML to string
const htmlToString = (html) => html?.replace(/<\/?[^>]+(>|$)/g, "");

export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-numeric characters
  let countryCode, localNumber;

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    countryCode = "91";
    localNumber = cleaned.slice(2);
  } else if (cleaned.startsWith("1") && cleaned.length === 11) {
    countryCode = "1";
    localNumber = cleaned.slice(1);
  } else if (cleaned.startsWith("44") && cleaned.length === 12) {
    countryCode = "44";
    localNumber = cleaned.slice(2);
  } else if (cleaned.startsWith("61") && cleaned.length === 11) {
    countryCode = "61";
    localNumber = cleaned.slice(2);
  } else {
    return `+${cleaned}`; // Default if format is unknown
  }

  switch (countryCode) {
    case "91": // India: +91 XXXXX-XXXXX
      return `+91 ${localNumber.slice(0, 5)}-${localNumber.slice(5)}`;
    case "1": // US/Canada: +1 (XXX) XXX-XXXX
      return `+1 (${localNumber.slice(0, 3)}) ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
    case "44": // UK: +44 XXXX XXXXXX
      return `+44 ${localNumber.slice(0, 4)} ${localNumber.slice(4)}`;
    case "61": // Australia: +61 X XXXX XXXX
      return `+61 ${localNumber.slice(0, 1)} ${localNumber.slice(1, 5)} ${localNumber.slice(5)}`;
    default:
      return `+${cleaned}`;
  }
};

const formatPhoneNumberWithPlusAndHyphens = (phoneNumber, formatString, dialCode) => {

  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Remove dial code if it's at the start of the number
  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length);
  }

  // Replace the dial code placeholder in format string using template literal
  // Modified regex to ensure proper handling of multi-digit dial codes
  let result = formatString.replace(/\+\.+/, `+${dialCode}`);

  // Count how many digits we need based on format string
  const requiredLength = (formatString.match(/\./g) || []).length;

  // Pad with empty string or truncate if necessary
  cleaned = cleaned.padEnd(requiredLength, ' ');
  if (cleaned.length > requiredLength) {
    cleaned = cleaned.slice(0, requiredLength);
  }

  // Replace each dot with the corresponding digit
  let digitIndex = 0;
  result = result.replace(/\./g, () => cleaned[digitIndex++] || '');

  // Remove any trailing spaces and their surrounding formatting
  result = result.replace(/\s+$/g, '');
  result = result.replace(/[-()\s]+$/g, '');

  return result;
};

const getMobileNumberFormat = (value, formatObj) => {
  try {
    if (value && value.length > 1 && formatObj && formatObj.format) {
      const format = formatObj.format;
      let formatArr = format.split('.');
      formatArr = formatArr.map((item, index) => {
        if (value[index]) {
          item += value[index];
        }

        return item
      })

      value = formatArr.join('');
      return value
    }

    return ""
  } catch (error) {
    console.log("src/utility/Utils.js : getMobileNumberFormat -> error", error);
    return ""
  }
}

// ** Checks if the passed date is today
const isToday = (date) => {
  const today = new Date();
  return (
    /* eslint-disable operator-linebreak */
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
    /* eslint-enable */
  );
};

/**
 ** Format and return date in Humanize format
 ** Intl docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format
 ** Intl Constructor: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 * @param {String} value date to format
 * @param {Object} formatting Intl object to format with
 */
const formatDate = (
  value,
  formatting = { month: "short", day: "numeric", year: "numeric" }
) => {
  if (!value) return value;
  return new Intl.DateTimeFormat("en-US", formatting).format(new Date(value));
};

const momentFormatDate = (date = null, format = "YYYY-MM-DD") => {
  if (!date) {
    date = new Date();
  }

  return moment(new Date(date)).format(format);
};

// ** Returns short month of passed date
const formatDateToMonthShort = (value, toTimeForCurrentDay = true) => {
  const date = new Date(value);
  let formatting = { month: "short", day: "numeric" };

  if (toTimeForCurrentDay && isToday(date)) {
    formatting = { hour: "numeric", minute: "numeric" };
  }

  return new Intl.DateTimeFormat("en-US", formatting).format(new Date(value));
};

/**
 ** Return if user is logged in
 ** This is completely up to you and how you want to store the token in your frontend application
 *  ? e.g. If you are using cookies to store the application please update this function
 */
const isUserLoggedIn = () => localStorage?.getItem(storageUserKeyName) || null;
const getUserData = () => JSON.parse(localStorage.getItem(storageUserKeyName));

/**
 ** This function is used for demo purpose route navigation
 ** In real app you won't need this function because your app will navigate to same route for each users regardless of ability
 ** Please note role field is just for showing purpose it's not used by anything in frontend
 ** We are checking role just for ease
 * ? NOTE: If you have different pages to navigate based on user ability then this function can be useful. However, you need to update it.
 * @param {String} userRole Role of user
 */

/**
 * Centralized logic to determine the home route for a user
 */
const getHomeRoute = (user, companyData = null) => {
  if (!user || !user?._id) return "/login";

  const roleName = user?.role?.name;
  const isSystemAdmin = user?.isSystemUser || roleName === 'Super Admin' || roleName === 'Admin';

  if (isSystemAdmin) return `${appsRoot}/dashboard`;

  // Company Admin: check subscription
  if (roleName === "Company Admin") {
    const isSubscribed = user?.hasActiveSubscription || companyData?.is_subscribe || user?.company?.is_subscribe;
    return isSubscribed ? `${appsRoot}/dashboard` : "/register";
  }

  // All other roles (Location Admin, Employee, custom roles) go to dashboard
  return `${appsRoot}/dashboard`;
};

const getHomeRouteForLoggedInUser = (user) => {
  return getHomeRoute(user);
};
// ** React Select Theme Colors
const selectThemeColors = (theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary25: "#7367f01a", // for option hover bg-color
    primary: "#7367f0", // for selected option bg-color
    neutral10: "#7367f0", // for tags bg-color
    neutral20: "#ededed", // for input border-color
    neutral30: "#ededed", // for input hover border-color
  },
});

const getCurrentUser = () => {
  let user = null;
  try {
    const item = localStorage.getItem(storageUserKeyName);
    if (item !== null) {
      const parsed = JSON.parse(item);
      // Return userData if nested, otherwise return the whole object
      user = parsed?.userData || parsed;
    }
  } catch (error) {
    console.log("src/utility/Utils.js : getCurrentUser -> error", error);
    user = null;
  }

  return user;
}

const setCurrentUser = (user) => {
  try {
    if (user) {
      if (!user?.ability) {
        user.ability = [{ action: "manage", subject: "all" }];
      }

      // Check if we already have a nested structure in localStorage
      const existingStr = localStorage.getItem(storageUserKeyName);
      let storageData = {};

      if (existingStr) {
        try {
          const parsed = JSON.parse(existingStr);
          if (parsed && typeof parsed === 'object') {
            storageData = parsed;
          }
        } catch (e) {
          // If not parseable, we'll start fresh
        }
      }

      // If 'user' already has userData/companyData, merge it
      if (user.userData || user.companyData) {
        storageData = { ...storageData, ...user };
      } else {
        // If 'user' is just the user object, put it in userData
        storageData = { ...storageData, userData: user };
      }

      localStorage.setItem(storageUserKeyName, JSON.stringify(storageData));
    } else {
      localStorage.removeItem(storageUserKeyName);
    }
  } catch (error) {
    console.log("src/utility/Utils.js : setCurrentUser -> error", error);
  }
}

/* Get access token or token from local storage */
const getAccessToken = () => {
  let token = null;
  try {
    token = localStorage.getItem(storageTokenKeyName) !== null ? JSON.parse(localStorage.getItem(storageTokenKeyName)) : null;
  } catch (error) {
    console.log("src/utility/Utils.js : getAccessToken -> error", error);
    token = null;
  }

  return token;
}

/* Set access token or token on local storage */
const setAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(storageTokenKeyName, JSON.stringify(token));
    } else {
      localStorage.removeItem(storageTokenKeyName);
    }
  } catch (error) {
    console.log("src/utility/Utils.js: setAccessToken -> error", error);
  }
}

/* Get access token or token from local storage */
const getRefreshToken = () => {
  let token = null;
  try {
    token = localStorage.getItem(storageRefreshTokenKeyName) !== null ? JSON.parse(localStorage.getItem(storageRefreshTokenKeyName)) : null;
  } catch (error) {
    console.log("src/utility/Utils.js : getRefreshToken -> error", error);
    token = null;
  }

  return token;
}

/* Set refresh token or token on local storage */
const setRefreshToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(storageRefreshTokenKeyName, JSON.stringify(token));
    } else {
      localStorage.removeItem(storageRefreshTokenKeyName);
    }
  } catch (error) {
    console.log("src/utility/Utils.js: setAccessToken -> error", error);
  }
}

const clearLocalStorage = () => {
  try {
    localStorage.clear();
  } catch (error) {
    console.log("src/utility/Utils.js: clearLocalStorage -> error", error);
  }
}

const handleImgSrcError = ({ currentTarget }, source = null) => {
  if (currentTarget) {
    currentTarget.onerror = null;
    currentTarget.src = source ?? defaultAvatar;
  }
}

const getISOStringFormattedDate = (date = null) => {
  if (!date) {
    date = new Date();
  }

  return `${new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

const calPercentage = function (num = 0, per = 0) {
  if (!num) {
    num = 0;
  }
  if (!per) {
    per = 0;
  }
  const result = (num / 100) * per;
  return parseFloat(result) || 0;
}

const getDecimalFormat = (value = 0) => {
  if (value) {
    return parseFloat(value).toFixed(2);
  }

  return "0.00";
}

const formatPrice = (value = 0, currencySymbol = null) => {
  // Get currency symbol from localStorage if not provided
  // The CurrencyContext stores it there after fetching from backend
  const symbol = currencySymbol || localStorage.getItem('currencySymbol') || '$';
  if (value || value === 0) {
    return `${symbol}${parseFloat(value).toFixed(2)}`;
  }

  return `${symbol}0.00`;
}

const getModulePermissionData = (role, permissionId = "") => {
  const bypass = roleBypassType.includes(role?.roleType);
  const permissions = role?.permissions || [];
  let permission = null;
  if (bypass) {
    permission =
      rolePermissionJson.find((x) => x.module_slug === permissionId) || null;
    permission = {
      ...permission,
      can_all: true,
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
    };
  } else {
    permission =
      permissions.find((x) => x.module_slug === permissionId) || null;
  }

  return permission;
};

const formatTimeToAMPM = (time) => {
  const [hours, minutes] = time.split(":");
  let hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12; // Convert to 12-hour format
  hour = hour ? hour : 12; // Handle the case of 0 which is midnight in 24-hour format
  const formattedTime = `${hour}:${minutes} ${ampm}`;

  return formattedTime;
};

const decodeMaskFormat = (value = "") => {
  const maskFormat = /[ ()_-]+/g;
  let result = value;
  if (result) {
    result = result.replace(maskFormat, "");
  }
  return result;
};

const isApproveButtonVisible = (bookingDate, bookingTime) => {
  // Ensure the bookingTime is in the correct format, e.g., add leading zero to single-digit hours
  const [hours, minutes] = bookingTime.split(":");
  const normalDate = new Date(bookingDate).toISOString().split('T')[0];
  const formattedTime = `${hours.padStart(2, "0")}:${minutes}`; // Ensure hours have leading zero if needed
  const fullDateTimeString = `${normalDate}T${formattedTime}:00`; // Combine bookingDate and bookingTime

  const bookingDateTime = new Date(fullDateTimeString);
  const currentTime = new Date(); // Get the current time

  // Calculate the difference in milliseconds
  const differenceInMs = bookingDateTime.getTime() - currentTime.getTime();

  // Convert milliseconds to hours
  const hoursLeft = differenceInMs / (1000 * 60 * 60);

  console.log("Booking DateTime:", bookingDateTime);
  console.log("Current Time:", currentTime);
  console.log("Hours Left:", hoursLeft); // Debugging log

  // Return true if more than 2 hours remain until booking time, else false
  return hoursLeft >= 2;
};


const getDomailUrl = () => {
  let url = window?.location?.origin || "";
  if (!url && window?.location) {
    const protocol = window.location?.protocol || "";
    const host = window.location?.host || "";
    if (protocol && host) {
      url = `${protocol}//${host}`;
    }
  }
  console.log("🚀 ~ getDomailUrl ~ url:", url);

  return url;
};

/* Return html value inside inner html */
const setInnerHtml = (value = "", classValue = "m-0") => {
  return (
    <div className={classValue} dangerouslySetInnerHTML={{ __html: value }} />
  )
}


export {
  isObjEmpty,
  kFormatter,
  htmlToString,
  formatPhoneNumberWithPlusAndHyphens,
  isToday,
  formatDate,
  momentFormatDate,
  formatDateToMonthShort,
  isUserLoggedIn,
  getUserData,
  getMobileNumberFormat,
  getHomeRoute,
  getHomeRouteForLoggedInUser,
  selectThemeColors,
  getCurrentUser,
  setCurrentUser,
  getAccessToken,
  setAccessToken,
  clearLocalStorage,
  handleImgSrcError,
  getISOStringFormattedDate,
  calPercentage,
  getDecimalFormat,
  formatPrice,
  getModulePermissionData,
  formatTimeToAMPM,
  isApproveButtonVisible,
  getRefreshToken,
  setRefreshToken,
  decodeMaskFormat,
  getDomailUrl,
  setInnerHtml
};

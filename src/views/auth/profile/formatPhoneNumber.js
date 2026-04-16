export const formatPhoneNumber = (phoneNumber, formatString, dialCode) => {

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
 
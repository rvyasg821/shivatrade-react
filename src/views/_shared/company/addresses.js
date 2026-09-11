// Company addresses — shared by the Company Profile page
// (views/auth/profile/editCompany/Step1CompanyDetails.js) and the admin
// Add/Edit Company page (views/company/add/index.js).

// A row the user added but never typed into — dropped from the payload.
export const isBlankAddressRow = (a) =>
  !a?.label?.trim() &&
  !a?.address_line1?.trim() &&
  !a?.address_line2?.trim() &&
  !a?.city?.trim() &&
  !a?.state?.trim() &&
  !a?.country?.trim() &&
  !a?.postcode?.trim() &&
  !a?.gstin?.trim();

// Previously only rows with line 1 / city / country / label were sent, so a
// row holding just a GSTIN, postcode, state or line 2 vanished on save.
// `_id` lets the backend update the row in place instead of re-creating it.
export const toAddressesPayload = (rows) =>
  (rows || [])
    .filter((a) => !isBlankAddressRow(a))
    .map((a) => ({
      _id: a._id || undefined,
      type: a.type || "corporate",
      label: a.label?.trim() || undefined,
      address_line1: a.address_line1?.trim() || undefined,
      address_line2: a.address_line2?.trim() || undefined,
      city: a.city?.trim() || undefined,
      state: a.state?.trim() || undefined,
      country: a.country?.trim() || undefined,
      postcode: a.postcode?.trim() || undefined,
      gstin: a.gstin?.trim() || undefined,
      is_default: !!a.is_default,
    }));

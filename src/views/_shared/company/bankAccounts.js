// Company bank accounts — shared by the Company Profile page
// (views/auth/profile/editCompany/Step1CompanyDetails.js) and the admin
// Add/Edit Company page (views/company/add/index.js).
import * as yup from "yup";

// A row the user added but never typed into — dropped from the payload
// without complaint. Any row with something filled in must be complete.
export const isBlankBankRow = (b) =>
  !b?.bank_name?.trim() &&
  !b?.account_holder_name?.trim() &&
  !b?.account_number?.trim() &&
  !b?.ifsc?.trim() &&
  !b?.swift_code?.trim() &&
  !b?.iban?.trim() &&
  !b?.ad_code?.trim() &&
  !b?.branch_name?.trim() &&
  !b?.branch_address?.trim() &&
  !b?.notes?.trim();

const requiredUnlessBlank = (message) =>
  yup.string().nullable().test("required-unless-blank", message, function (value) {
    return isBlankBankRow(this.parent) || !!String(value || "").trim();
  });

// Previously the payload silently filtered out incomplete rows, so saving a
// bank with no account number reported "updated" while dropping the account.
export const bankAccountsSchema = (t) =>
  yup.array().of(
    yup.object().shape({
      bank_name: requiredUnlessBlank(`${t("Bank Name is required")}.`),
      account_number: requiredUnlessBlank(`${t("Account Number is required")}.`),
      currency_id: requiredUnlessBlank(`${t("Currency is required")}.`),
    })
  );

export const toBankAccountsPayload = (rows) =>
  (rows || [])
    .filter((b) => !isBlankBankRow(b))
    .map((b) => ({
      // Lets the backend update the account in place — re-creating it gave
      // it a new id and orphaned documents that stored the old one.
      _id: b._id || undefined,
      bank_name: b.bank_name.trim(),
      account_holder_name: b.account_holder_name?.trim() || undefined,
      account_number: b.account_number.trim(),
      ifsc: b.ifsc?.trim() || undefined,
      swift_code: b.swift_code?.trim() || undefined,
      iban: b.iban?.trim() || undefined,
      ad_code: b.ad_code?.trim() || undefined,
      currency_id: b.currency_id,
      branch_name: b.branch_name?.trim() || undefined,
      branch_address: b.branch_address?.trim() || undefined,
      account_type: b.account_type || "current",
      is_default: !!b.is_default,
      notes: b.notes?.trim() || undefined,
      is_active: b.is_active !== false,
    }));

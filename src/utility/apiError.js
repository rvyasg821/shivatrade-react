// Readable message from a failed API call. Backend validation failures arrive
// as { message: "There are validation errors.", errors: [{ property, message }] }
// — show the field messages, not just that generic headline.
export const apiErrorMessage = (err, fallback = "Something went wrong") => {
  const data = err?.response?.data || err;
  const fieldMessages = Array.isArray(data?.errors)
    ? data.errors.map((e) => e?.message).filter(Boolean)
    : [];
  if (fieldMessages.length) return fieldMessages.join(" ");
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof err === "string" && err) return err;
  return fallback;
};

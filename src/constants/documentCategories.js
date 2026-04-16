// Static document categories — Option A (no DB API call needed)
// requires_expiry: true → expiry date field is mandatory for this category

export const DOCUMENT_CATEGORIES = [
  { value: "contract",        label: "Contract",                  requires_expiry: false },
  { value: "passport_id",     label: "Passport / ID",             requires_expiry: true  },
  { value: "visa",            label: "Visa",                      requires_expiry: true  },
  { value: "brp",             label: "BRP Card",                  requires_expiry: true  },
  { value: "right_to_work",   label: "Right to Work",             requires_expiry: true  },
  { value: "dbs_check",       label: "DBS Check",                 requires_expiry: true  },
  { value: "p45",             label: "P45",                       requires_expiry: false },
  { value: "p60",             label: "P60",                       requires_expiry: false },
  { value: "certificate",     label: "Certificate / Qualification", requires_expiry: false },
  { value: "medical",         label: "Medical / Health",          requires_expiry: true  },
  { value: "training",        label: "Training Record",           requires_expiry: false },
  { value: "reference",       label: "Reference Letter",          requires_expiry: false },
  { value: "other",           label: "Other",                     requires_expiry: false },
];

export default DOCUMENT_CATEGORIES;

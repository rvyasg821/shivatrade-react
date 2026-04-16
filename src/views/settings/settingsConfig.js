// src/views/settings/settingsConfig.js
const settingsConfig = {
  general: [
    {
      name: 'admin_email',
      label: 'Admin Email',
      type: 'email',
    },
  ],

  smtp: [
    {
      name: 'from_email',
      label: 'SMTP Email',
      type: 'email',
    },
    {
      name: 'from_name',
      label: 'SMTP Name',
      type: 'text',
    },
    {
      name: 'smtp_host',
      label: 'SMTP Host',
      type: 'text',
    },
    {
      name: 'smtp_port',
      label: 'SMTP Port',
      type: 'number',
    },
    {
      name: 'auth_email', // ✅ extra field (not in API but still displayed)
      label: 'Auth Email',
      type: 'email',
    },
    {
      name: 'auth_password', // ✅ extra field (not in API but still displayed)
      label: 'Auth Password',
      type: 'password',
    },
  ],
  payment: [
    {
      name: 'publishable_key',
      label: 'Stripe Publishable key',
      type: 'text',
    },
    {
      name: 'secret_key',
      label: 'Stripe Secret Key',
      type: 'password',
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
    },
    {
      name: 'platform_account_id',
      label: 'Platform Account Id',
      type: 'text',
    },
  ],
};

export default settingsConfig;

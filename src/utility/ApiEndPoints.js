export const API_ENDPOINTS = {
  auth: {
    login: `/public/auth/login`,
    me: `/admin/auth/me`,
    refreshToken: `/shared/auth/refresh`,
    updateMe: `/admin/auth/update-profile`,
    changePassword: `/shared/auth/change-password`,
    forgotPassword: `/auth/forgot-password`,
    requestResetPasswordOtp: `/public/reset-password/request`,
    resetPasswordOtpVerify: `/public/reset-password/verify`,
    verifyToken: `/public/reset-password/get`,
    resetPassword: `/public/reset-password/reset`,
    customerIdentifier: '/modules/customers/me',
    loginwithotp: `/auth/customer/otpgenerate`,
    varifyloginotp: `/auth/customer/login`,
    register: 'public/auth/register',
    generateEmailOtp: '/public/auth/otp/generate',
    verifyEmailOtp: "/public/auth/otp/verify",
    userExist: '/admin/user/isuserexists',
    referalCodeValidation: '/admin/user/agent/isvalid/{referalCode}',
    discountCodeApply: '/public/discount/validate-and-apply',
  },
  roles: {
    list: `/admin/role/list`,
    get: `/admin/role/get`,
    create: `/admin/role/create`,
    update: `/admin/role/update`,
    delete: `/admin/role/delete`,
  },
  tenantRoles: {
    list: `/tenant/{tenantId}/roles`,
    get: `/tenant/{tenantId}/roles/{roleId}`,
    create: `/tenant/{tenantId}/roles`,
    update: `/tenant/{tenantId}/roles/{roleId}`,
  },
  tenantLocations: {
    list: `/tenant/{tenantId}/locations`,
    get: `/tenant/{tenantId}/locations/{locationId}`,
    create: `/tenant/{tenantId}/locations`,
    update: `/tenant/{tenantId}/locations/{locationId}`,
    delete: `/tenant/{tenantId}/locations/{locationId}`,
  },
  eventLogs: {
    list: `/tenant/event-logs`,
  },
  agent:
  {
    get: `/admin/user/get/agents`,
    create: `/admin/user/agent/create`,
  },
  users: {
    list: `/admin/user/list`,
    get: `/admin/user/get`,
    create: `/admin/user/create`,
    update: `/admin/user/update`,
    delete: `/admin/user/delete`,
  },
  tenantUsers: {
    list: `/tenant/{tenantId}/users`,
    get: `/tenant/{tenantId}/users/{userId}`,
    create: `/tenant/{tenantId}/users`,
    update: `/tenant/{tenantId}/users/{userId}`,
    delete: `/tenant/{tenantId}/users/{userId}`,
  },
  customers: {
    list: `/admin/customer/list`,
    get: `/admin/customer/get`, // append /:id
    create: `/admin/customer/create`,
    update: `/admin/customer/update`, // append /:id
    delete: `/admin/customer/delete`, // append /:id
    dropdown: `/admin/customer/dropdown`,
    updateMe: `/admin/customer/update`,
    existance: `/modules/customers/isUserExists`,
    updateprofile: `/modules/customers/update-profile`,
    getallbookings: `/modules/booking-management/booking/customer`,
    bookingItem: `/modules/booking-management/booking`,
  },
  smstemplates: {
    list: `/modules/system/sms-template`,
    get: `/modules/system/sms-template`,
    create: `/modules/system/sms-template`,
    update: `/modules/system/sms-template`,
    delete: `/modules/system/sms-template`,
  },
  emailtemplates: {
    list: `/modules/system/email-template`,
    get: `/modules/system/email-template`,
    create: `/modules/system/email-template`,
    update: `/modules/system/email-template`,
    delete: `/modules/system/email-template`,
  },
  services: {
    list: `/modules/catalog/services`,
    get: `/modules/catalog/services`,
    create: `/modules/catalog/services`,
    update: `/modules/catalog/services`,
    delete: `/modules/catalog/services`,
    existance: `/modules/catalog/services/isServiceExists`,
  },
  addOnServices: {
    list: `/modules/catalog/add-on-services`,
    get: `/modules/catalog/add-on-services`,
    create: `/modules/catalog/add-on-services`,
    update: `/modules/catalog/add-on-services`,
    delete: `/modules/catalog/add-on-services`,
    existance: `/modules/catalog/add-on-services/isAddOnServiceExists`,
    drpdwn: {
      list: `/modules/catalog/add-on-services/dropdown`,
    },
  },
  countries: {
    list: `/modules/master/countries`,
    get: `/modules/master/countries`,
    create: `/modules/master/countries`,
    update: `/modules/master/countries`,
    delete: `/modules/master/countries`,
    currencyList: `modules/master/countries/currencycode`,
  },
  states: {
    list: `/modules/master/states`,
    get: `/modules/master/states`,
    create: `/modules/master/states`,
    update: `/modules/master/states`,
    delete: `/modules/master/states`,
    drpdwn: `/modules/master/states/dropdown`,
    getstatebycountrycode: `/modules/master/countries/countrycode`,
  },
  cities: {
    list: `/modules/master/cities`,
    get: `/modules/master/cities`,
    create: `/modules/master/cities`,
    update: `/modules/master/cities`,
    delete: `/modules/master/cities`,
    drpdwn: `/modules/master/cities/dropdown`,
  },
  locations: {
    list: `/admin/location/list`,
    get: `/admin/location/get`,
    create: `/admin/location/create`,
    update: `/admin/location/update`,
    delete: `/admin/location/delete`,
    dropdown: `/admin/location/list`,
    capacity: `/admin/location/capacity`,
  },
  categories: {
    list: `/admin/category/list`,
    get: `/admin/category/get`,
    create: `/admin/category/create`,
    update: `/admin/category/update`,
    delete: `/admin/category/delete`,
    dropdown: `/admin/category/dropdown`,
    import: `/admin/category/import`,
    export: `/admin/category/export`,
    sampleExcel: `/admin/category/sample-excel`,
  },
  portMaster: {
    list: `/admin/port-master/list`,
    get: `/admin/port-master/get`,
    create: `/admin/port-master/create`,
    update: `/admin/port-master/update`,
    delete: `/admin/port-master/delete`,
    dropdown: `/admin/port-master/dropdown`,
  },
  products: {
    list: `/admin/product/list`,
    get: `/admin/product/get`,
    create: `/admin/product/create`,
    update: `/admin/product/update`,
    delete: `/admin/product/delete`,
    dropdown: `/admin/product/dropdown`,
    checkCode: `/admin/product/check-code`,
    checkName: `/admin/product/check-name`,
    import: `/admin/product/import`,
    export: `/admin/product/export`,
    sampleExcel: `/admin/product/sample-excel`,
  },
  vendors: {
    list: `/admin/vendor/list`,
    get: `/admin/vendor/get`,
    create: `/admin/vendor/create`,
    update: `/admin/vendor/update`,
    delete: `/admin/vendor/delete`,
    dropdown: `/admin/vendor/dropdown`,
    checkCode: `/admin/vendor/check-code`,
    import: `/admin/vendor/import`,
    sampleExcel: `/admin/vendor/sample-excel`,
  },
  currencies: {
    list: `/admin/currency/list`,
    get: `/admin/currency/get`,
    create: `/admin/currency/create`,
    update: `/admin/currency/update`,
    delete: `/admin/currency/delete`,
    dropdown: `/admin/currency/dropdown`,
    rates: `/admin/currency`, // append `/${id}/rates`
    currentRate: `/admin/currency/exchange-rate/current`, // ?to=<code>
    exchangeOptions: `/admin/currency/exchange-rate/options`,
  },
  priceList: {
    list: `/admin/price-list/list`,
    get: `/admin/price-list/get`,
    create: `/admin/price-list/create`,
    bulk: `/admin/price-list/bulk`,
    update: `/admin/price-list/update`,
    delete: `/admin/price-list/delete`,
    byProduct: `/admin/price-list/by-product`,
    byProducts: `/admin/price-list/vendors-by-products`,
    currentPrices: `/admin/price-list/current-prices`,
    bestPrices: `/admin/price-list/best-prices`,
    import: `/admin/price-list/import`,
    export: `/admin/price-list/export`,
    sampleExcel: `/admin/price-list/sample-excel`,
  },
  quotations: {
    list: `/admin/quotation/list`,
    stats: `/admin/quotation/stats`,
    get: `/admin/quotation/get`,
    create: `/admin/quotation/create`,
    update: `/admin/quotation/update`,
    delete: `/admin/quotation/delete`,
    publish: `/admin/quotation/publish`,
    rotateToken: `/admin/quotation/rotate-token`,
    unpublish: `/admin/quotation/unpublish`,
    publicPreview: `/admin/quotation/public-preview`,
    pdf: `/admin/quotation`, // append /:id/pdf (authed; opened as a blob in a new tab)
    public: `/public/quotation`,
  },
  pfis: {
    list: `/admin/pfi/list`,
    stats: `/admin/pfi/stats`,
    get: `/admin/pfi/get`,
    create: `/admin/pfi/create`,
    update: `/admin/pfi/update`,
    delete: `/admin/pfi/delete`,
    fromQuotation: `/admin/pfi/from-quotation`, // append /:quotationId
    publish: `/admin/pfi/publish`,
    rotateToken: `/admin/pfi/rotate-token`,
    unpublish: `/admin/pfi/unpublish`,
    publicPreview: `/admin/pfi/public-preview`,
    public: `/public/pfi`,
    pdf: `/admin/pfi`, // append /:id/pdf
    publicPdf: `/public/pfi`, // append /:token/pdf
  },
  purchaseOrders: {
    list: `/admin/purchase-order/list`,
    stats: `/admin/purchase-order/stats`,
    get: `/admin/purchase-order/get`,
    create: `/admin/purchase-order/create`,
    update: `/admin/purchase-order/update`,
    delete: `/admin/purchase-order/delete`,
    fromPfi: `/admin/purchase-order/from-pfi`, // append /:pfiId
    fromQuotation: `/admin/purchase-order/from-quotation`, // append /:quotationId
    previewFromPfi: `/admin/purchase-order/preview-from-pfi`, // append /:pfiId
    previewFromQuotation: `/admin/purchase-order/preview-from-quotation`, // append /:quotationId
    publicPreview: `/admin/purchase-order/public-preview`, // append /:id
    publish: `/admin/purchase-order/publish`, // append /:id
    rotateToken: `/admin/purchase-order/rotate-token`, // append /:id
    unpublish: `/admin/purchase-order/unpublish`, // append /:id
    public: `/public/purchase-order`, // append /:token
    publicPdf: `/public/purchase-order`, // append /:token/pdf
    pdf: `/admin/purchase-order`, // append /:id/pdf (authed; opened as a blob in the in-app viewer)
    coverage: `/admin/purchase-order`, // append /:id/coverage
    pfiCoverage: `/admin/purchase-order/pfi-coverage`, // append /:pfiId
    quotationCoverage: `/admin/purchase-order/quotation-coverage`, // append /:quotationId
  },
  poVendors: {
    list: `/admin/po-vendor/list`,
    stats: `/admin/po-vendor/stats`,
    get: `/admin/po-vendor/get`,
    create: `/admin/po-vendor/create`, // standalone (no source Sales Order)
    update: `/admin/po-vendor/update`,
    delete: `/admin/po-vendor/delete`,
    fromPo: `/admin/po-vendor/from-po`, // append /:poId
    recoverPreview: `/admin/po-vendor/recover-preview`, // append /:poId
    recover: `/admin/po-vendor/recover`, // append /:poId
    dispatch: `/admin/po-vendor`, // append /:id/dispatch
    cancel: `/admin/po-vendor`, // append /:id/cancel
    revertDraft: `/admin/po-vendor`, // append /:id/revert-draft
    pdf: `/admin/po-vendor`, // append /:id/pdf (authed; opened in the in-app viewer). Payment voucher: /:id/payment-pdf/:paymentId
    payments: `/admin/po-vendor/payments`, // append /:id (POST record); /:id/void/:paymentId (POST void)
  },
  inventory: {
    list: `/admin/inventory/list`,
    stats: `/admin/inventory/stats`,
    stock: `/admin/inventory/stock`, // ledger on-hand summary
    movements: `/admin/inventory/movements`, // append /:productId
    receipt: `/admin/inventory/receipt`, // append /:povLineId
  },
  invoices: {
    list: `/admin/invoice/list`,
    stats: `/admin/invoice/stats`,
    leaderboard: `/admin/invoice/leaderboard`,
    get: `/admin/invoice/get`, // append /:id
    create: `/admin/invoice/create`,
    update: `/admin/invoice/update`, // append /:id
    delete: `/admin/invoice/delete`, // append /:id
    issue: `/admin/invoice/issue`, // append /:id
    issuePreview: `/admin/invoice/issue-preview`, // append /:id
    cancel: `/admin/invoice/cancel`, // append /:id
    pdf: `/admin/invoice`, // append /:id/pdf?doc=commercial|packing-list
    poAddable: `/admin/invoice/po-addable`, // append /:poId?exclude_invoice_id=...
    customerInvoiceable: `/admin/invoice/customer-invoiceable`, // append /:customerId
    linesExport: `/admin/invoice/lines/export`, // ?purchase_order_id=...&invoice_id=...
    linesResolve: `/admin/invoice/lines/resolve`,
    payments: `/admin/invoice/payments`, // append /:invoiceId  (GET list / POST record)
    voidPayment: `/admin/invoice/payments`, // append /:invoiceId/void/:paymentId
    event: `/admin/invoice/event`, // GET/POST /:invoiceId ; POST /:eventId/retract
  },
  shipping: {
    list: `/admin/shipping/list`,
    get: `/admin/shipping/get`, // append /:id
    create: `/admin/shipping/create`,
    update: `/admin/shipping/update`, // append /:id
    delete: `/admin/shipping/delete`, // append /:id
    transition: `/admin/shipping/transition`, // append /:id
    cancel: `/admin/shipping/cancel`, // append /:id
    attachInvoices: `/admin/shipping/attach-invoices`, // append /:id
    detachInvoice: `/admin/shipping/detach-invoice`, // append /:invoiceId
    addEvent: `/admin/shipping/event`, // append /:shippingId
    retractEvent: `/admin/shipping/event`, // append /:eventId/retract
  },
  salesDocImport: {
    resolve: `/admin/sales-doc/import/resolve`,
    sample: `/admin/sales-doc/import/sample`,
    export: `/admin/sales-doc/import/export`,
  },
  trackingEvents: {
    list: `/admin/tracking-event/list`,
    byPov: `/admin/tracking-event/by-pov`, // append /:povId
    create: `/admin/tracking-event`,
    delete: `/admin/tracking-event`, // append /:id
  },
  customers: {
    list: `/admin/customer/list`,
    get: `/admin/customer/get`,
    create: `/admin/customer/create`,
    update: `/admin/customer/update`,
    delete: `/admin/customer/delete`,
    dropdown: `/admin/customer/dropdown`,
  },
  leads: {
    list: `/admin/lead/list`,
    stats: `/admin/lead/stats`,
    get: `/admin/lead/get`,
    create: `/admin/lead/create`,
    update: `/admin/lead/update`,
    delete: `/admin/lead/delete`,
    convert: `/admin/lead/convert`,
    activity: `/admin/lead`, // append `/${leadId}/activity[/<activityId>]`
  },
  rfq: {
    list: `/admin/rfq/list`,
    stats: `/admin/rfq/stats`,
    get: `/admin/rfq/get`, // append /:id
    fromLead: `/admin/rfq/from-lead`, // append /:leadId
    update: `/admin/rfq/update`, // append /:id
    delete: `/admin/rfq/delete`, // append /:id
    vendors: `/admin/rfq`, // append /:id/vendors  (POST add, DELETE /:vendorId)
    prices: `/admin/rfq`, // append /:id/prices
    select: `/admin/rfq`, // append /:id/select
    pdf: `/admin/rfq`, // append /:id/pdf?vendor_id=
    vendorPriceSheets: `/admin/rfq/vendor-price-sheets`, // ?lead_id=&vendor_ids= (zip)
    vendorPriceSheet: `/admin/rfq/vendor-price-sheet`, // ?lead_id=&vendor_id=&product_ids= (single xlsx)
    importVendorPrices: `/admin/rfq/import-vendor-prices`, // POST multipart
  },
  grn: {
    list: `/admin/grn/list`,
    stats: `/admin/grn/stats`,
    sourcePovs: `/admin/grn/source-povs`,
    fromPov: `/admin/grn/from-pov`, // append /:povId
    get: `/admin/grn/get`, // append /:id
    update: `/admin/grn/update`, // append /:id
    delete: `/admin/grn/delete`, // append /:id
    pdf: `/admin/grn`, // append /:id/pdf (authed; opened in the in-app viewer)
  },
  debitNotes: {
    list: `/admin/debit-note/list`,
    fromGrn: `/admin/debit-note/from-grn`, // append /:grnId
    forGrn: `/admin/debit-note/for-grn`, // append /:grnId
    get: `/admin/debit-note/get`, // append /:id
    update: `/admin/debit-note/update`, // append /:id
    delete: `/admin/debit-note/delete`, // append /:id
    pdf: `/admin/debit-note`, // append /:id/pdf (authed; opened in the in-app viewer)
  },
  rebates: {
    list: `/admin/rebate/list`,
    get: `/admin/rebate/get`,
    create: `/admin/rebate/create`,
    update: `/admin/rebate/update`,
    delete: `/admin/rebate/delete`,
    dropdown: `/admin/rebate/dropdown`,
  },
  expenses: {
    list: `/admin/expense/list`,
    get: `/admin/expense/get`,
    create: `/admin/expense/create`,
    update: `/admin/expense/update`,
    delete: `/admin/expense/delete`,
    dropdown: `/admin/expense/dropdown`,
  },
  employees: {
    list: `/admin/employee/list`,
    get: `/admin/employee/get`,
    create: `/admin/employee/create`,
    update: `/admin/employee/update`,
    delete: `/admin/employee/delete`,
    checkEmail: `/admin/employee/check-email`,
    checkCode: `/admin/employee/check-code`,
    locationAssignments: `/admin/employee/location-assignments`,
    export: `/admin/employee/export`,
    sampleCsv: `/admin/employee/sample-csv`,
    import: `/admin/employee/import`,
    impersonate: `/admin/employee/impersonate`,
  },
  company: {
    list: `/admin/company/my-company`,
    getList: `/admin/company/list`,
    get: `/admin/company/get`,
    create: `/admin/company/create`,
    checkEmail: `/admin/company/check-email`,
    updateProfile: `/admin/company/my-company`,
    updateDetails: `/admin/company/update`,
    delete: `/admin/company/delete`,
    impersonate: `/admin/company/impersonate`,
    suspend: `/admin/company/suspend`,
    reactivate: `/admin/company/reactivate`,
  },
  plan: {
    list: `/admin/plan/list`,
    get: `/admin/plan`,
    create: `/admin/plan/create`,
    update: `/admin/plan`,
    delete: `/admin/plan`,
    publicFilteredList: `/public/plan/filtered/list`,
  },
  subscription: {
    startTrial: `/public/subscription/start-trial`,
    myStatus: `/admin/subscription/my-status`,
  },
  tools: {
    list: `/admin/tools/list`,
    get: `/admin/tools`,
    create: `/admin/tools/create`,
    update: `/admin/tools`,
    delete: `/admin/tools`,
    analytics: {
      overview: `/admin/tools/analytics/overview`,
    },
    status: `/admin/tools/status`,
  },
  tenantTools: {
    list: `/tenant/{tenantId}/tools`,
    get: `/tenant/{tenantId}/tools/{id}`,
    create: `/tenant/{tenantId}/tools`,
    update: `/tenant/{tenantId}/tools/{id}`,
    delete: `/tenant/{tenantId}/tools/{id}`,
    status: `/tenant/{tenantId}/tools/{id}/status`,
    toolUpdate: '/admin/tools/{tool}/update'
  },
  toolSchedule: {
    list: `/tenant/{tenantId}/tool-schedules`,
    get: `/tenant/{tenantId}/tool-schedules/{id}`,
    create: `/tenant/{tenantId}/tool-schedules`,
    update: `/tenant/{tenantId}/tool-schedules/{id}`,
    delete: `/tenant/{tenantId}/tool-schedules/{id}`,
    status: `/tenant/{tenantId}/tool-schedules/{id}/status`,
  },
  tenantToolSettings: {
    getByTool: `/tenant/{tenantId}/tool-settings/tool/{tenantToolId}`,
    update: `/tenant/{tenantId}/tool-settings/{settingId}`,
  },
  tenantToolCron: {
    getBySetting: `/tenant/{tenantId}/tool-setting-cron/setting/{tenantToolSettingId}`,
    getByTool: `/tenant/{tenantId}/tool-setting-cron/tool/setting/{tenantToolId}`,
    update: `/tenant/{tenantId}/tool-setting-cron/{cronId}`,
  },
  settings: {
    list: `/admin/setting/list`,
    get: `/modules/system/setting`,
    create: `/modules/system/setting`,
    update: `/admin/setting/update`,
    delete: `/modules/system/setting`,
  },
  Area: {
    list: `/modules/price-management/area`,
    get: `/modules/price-management/area`,
    create: `/modules/price-management/area`,
    update: `/modules/price-management/area`,
    delete: `/modules/price-management/area`,
  },
  Price: {
    list: `/modules/price-management/add-on-pricing/listing`,
    get: `/modules/price-management/add-on-pricing`,
    create: `/modules/price-management/add-on-pricing`,
    update: `/modules/price-management/add-on-pricing`,
    delete: `/modules/price-management/add-on-pricing`,
    location: `/modules/master/location/dropdown`,
    services: {
      list: `/modules/catalog/services/dropdown`,
    },
    //For Bedroom/Bathroom
    roomPricing: {
      create: `/modules/price-management/bedroom-bathroom`,
      get: `/modules/price-management/bedroom-bathroom`,
      update: `/modules/price-management/bedroom-bathroom`,
      delete: `/modules/price-management/bedroom-bathroom`,
    },
    //For Home rating price list
    homeRatingPrice: {
      list: `/modules/price-management/home-clean-price-percent/fetch`,
      update: `/modules/price-management/home-clean-price-percent`,
    },
  },
  AllPrice: {
    list: `/modules/price-management/price/list`,
    create: `/modules/price-management/price`,
    update: `/modules/price-management/price`,
  },
  Contractors: {
    create: `/modules/service-provider`,
    update: `/modules/service-provider`,
    list: `/modules/users/contractors`,
    delete: `/modules/service-provider`,
    get: `/modules/service-provider`,
    createContracterDetails: `/modules/users/constractor/create`,
    signup: `/modules/contractor-web/generate`,
    varify: `/modules/contractor-web/verify`,
    sendlink: `/modules/users/sendmobileapp/link`,
    getallbookings: `modules/booking-management/booking/contractor-bookings`,
    bookingItem: `/modules/booking-management/booking`,
    isUserExist: `/modules/users/isUserExists`,
  },
  Availability: {
    create: `/modules/service-providers-availability`,
    update: `/modules/service-providers-availability`,
    // list: `/modules/service-provider`,
    // delete: `/modules/service-provider`,
    get: `/modules/service-providers-availability`,
  },
  Document: {
    list: `/modules/document-management`,
    get: `/modules/document-management/user`,
    create: `/modules/document-management`,
    update: `/modules/document-management`,
    delete: `/modules/document-management`,
  },
  Subscription: {
    list: `/admin/subscription/list`,
    cancel: `/admin/subscription`,
    getmysubscription: `/public/subscription/my-subscription`,
    getbyid: `/admin/subscription/company`,
    getmysubscription: `/public/subscription/my-subscription`,
    get: `/admin/subscription`,
    create: `/modules/booking-management/subscription`,
    update: `/admin/subscription`,
    delete: `/modules/booking-management/subscription`,
  },
  discount: {
    list: `/admin/discount/list`,
    delete: `/admin/discount`,
    deleteMany: `/admin/discount/delete-many`,
    create: `/admin/discount/create`,
    get: `/admin/discount`,
    update: `/admin/discount`,
    validateWithLocation: `/public/discount/validate-with-location`,
    validateOnPlanChange: `/public/discount/validate-on-plan-change`,
  },
  SubscriptionPlans: {
    list: `/modules/booking-management/subscription`,
    get: `/modules/booking-management/subscription`,
    create: `/modules/booking-management/subscription`,
    update: `/modules/booking-management/subscription`,
    delete: `/modules/booking-management/subscription`,
  },
  CustomerSubscriptions: {
    list: `/modules/booking-management/customer-subscription`,
    get: `/modules/booking-management/customer-subscription`,
    create: `/modules/booking-management/customer-subscription`,
    update: `/modules/booking-management/customer-subscription`,
    delete: `/modules/booking-management/customer-subscription`,
  },
  deleteImages: {
    create: `/auth/delete-file-from-Server`,
  },
  existance: {
    user: `/modules/users/isUserExists`,
    zipcode: `/modules/master/location/zipcode`,
    frequancy: `/modules/price-management/frequency/dropdown`,
    Area: `/modules/price-management/area/dropdown`,
    homecleaness: `/modules/price-management/home-clean-price-percent/fetch`,
    serviceprovideravaibility: `/modules/service-provider/availability`,
    questionget: `/modules/booking-management/questionform/by-service`,
    getcontractor: `/modules/service-provider/provider-by-availability-slot`,
    specificprice: `/modules/price-management/price/specific-price`,
  },
  dropdown: {
    countries: `/modules/master/countries/dropdown`,
    state: `/modules/master/states/dropdown`,
    city: `/modules/master/cities/dropdown`,
  },
  booking: {
    createcustomer: `/modules/customers/browser/create`,
    customeraddress: `/modules/addresses`,
    orderbooking: `/modules/booking-management/booking-order`,
    finalbooking: `/modules/booking-management/booking`,
    customerBooking: `/modules/booking-management/booking/customer`,
    contractorBooking: `/modules/booking-management/booking/contractor-bookings`,
    contractorSales: `/modules/booking-management/booking/contractor-sales`,
    reschedule: `/modules/booking-management/booking/reschedule`,
    cancel: `/modules/booking-management/booking/cancel`,
    approve: `/modules/booking-management/booking/approave`,
    pricecalculation: `/modules/booking-management/booking/getcalculated`,
    // address:`/modules/addresses/search/address`
    address: `https://api.opencagedata.com/geocode/v1/json`,
  },

  serviceQuestions: {
    create: `/modules/booking-management/questionform`,
    details: `/modules/booking-management/questionform`,
    update: `/modules/booking-management/questionform`,
    list: `/modules/booking-management/questionform`,
    delete: `/modules/booking-management/questionform`,
  },
  payments: {
    list: `/admin/payment/list`,
    detail: `/admin/payment/detail`,
    downloadInvoice: `/admin/payment/download-invoice`,
    sendInvoice: `/admin/payment/send-invoice`,
    myDownloadInvoice: `/public/payment/download-invoice`,
    get: `/public/payment/my-payments`,
    create: `/modules/system/payments`,
    update: `/modules/system/payments`,
    delete: `/modules/system/payments`,
    paypalCardPayment: `/public/payment/paypal-card-payment`,
    confirmPaypalPayment: `/public/payment/confirm-redirect-paypal-payment`,
    stripeConfig: `/public/payment/stripe-config`,
    stripeCardPayment: `/public/payment/stripe-card-payment`,
    stripeConfirmPayment: `/public/payment/stripe-confirm-payment`,
    storedCard: `/admin/card/list`,
    activeCard: `/admin/card/active-card`,
  },
  dashboard: {
    getAllWidgets: '/shared/widgets',
    updateWidgets: 'shared/widgets/update',
    adminStats: '/admin/dashboard/stats',
    recentActivity: '/admin/dashboard/recent-activity',
    chartData: '/admin/dashboard/chart-data',
    companies: '/admin/dashboard/companies',
    companyStats: '/admin/dashboard/company-stats',
    operationsStats: '/admin/dashboard/operations-stats',
  },
  assessmentForms: {
    list: '/admin/assessment/list',
    delete: '/admin/assessment/delete',
    create: '/admin/assessment/create',
    get: "/admin/assessment/get",
    update: "/admin/assessment/update"
  },
  sectionAssessment: {
    byAssessment: "/admin/sections/by-assessment",
    byQuestions: "/admin/questions/grouped-by-assessment",
    deleteQuestion: "/admin/questions/delete",
    sectionDelete: "/admin/sections/delete",
    sectionCreate: "/admin/sections/create",
    sectionUpdate: "/admin/sections/update",
    bulkOrderUpdate: "/admin/questions/bulk-update-order",
    updateSectionsOrder: "/admin/assessment/update-sections-order"
  },
  questionAssessment: {
    sectionDropdown: "/admin/sections/dropdown",
    createQuestion: "/admin/questions/create",
    getQuestion: "/admin/questions/get",
    updateQuestion: "/admin/questions/update",
  },
  assessmentReport: {
    createReport: "/admin/assessment_reports/create",
    verify: "/admin/assessment_reports/verify",
    generatePdf: "/admin/assessment_reports/generate-pdf",
    generatePdfEmail: "/admin/assessment_reports/generate-pdf-email",
    reportlist: "/admin/assessment_reports/list",
    deleteReport: "/admin/assessment_reports/delete",
    getReportByID: "/admin/assessment_reports/get",
    getQuestionsByReport: "/admin/assessment_reports/assessment-reports-questions",
    getReportByID: "/admin/assessment_reports/get",
    updateEmail: "/admin/assessment_reports/update",
    getSingleReport: "/admin/assessment_reports/get/report"
  },
  questionAnswer: {
    getQuestion: "/admin/assessment_reports/assessment-reports-questions"
  },
  questionCrud: {
    createQuestion: "/admin/question-answers/create",
    updateQuestion: "/admin/question-answers/update"
  },

  // HRM: Holiday Calendar
  holidayCalendar: {
    list: '/admin/holiday-calendar/list',
    get: '/admin/holiday-calendar/get',
    create: '/admin/holiday-calendar/create',
    update: '/admin/holiday-calendar/update',
    delete: '/admin/holiday-calendar/delete',
    importUk: '/admin/holiday-calendar/import-uk',
    holidays: '/admin/holiday-calendar/holidays',
    holidayCreate: '/admin/holiday-calendar/holiday/create',
    holidayUpdate: '/admin/holiday-calendar/holiday/update',
    holidayDelete: '/admin/holiday-calendar/holiday/delete',
  },
  document: {
    list: '/admin/document/list',
    get: '/admin/document/get',
    upload: '/admin/document/upload',
    update: '/admin/document/update',
    delete: '/admin/document/delete',
    download: '/admin/document/download',
    approve: '/admin/document/approve',
    reject: '/admin/document/reject',
    categoryList: '/admin/document/category/list',
    categoryCreate: '/admin/document/category/create',
    categoryUpdate: '/admin/document/category/update',
    categoryDelete: '/admin/document/category/delete',
  },
  leave: {
    // Leave types
    typeList: '/admin/leave/type/list',
    typeCreate: '/admin/leave/type/create',
    typeUpdate: '/admin/leave/type/update',
    typeDelete: '/admin/leave/type/delete',
    // Policy
    policy: '/admin/leave/policy',
    // Entitlements
    entitlementUser: '/admin/leave/entitlement/user',
    entitlementUpdate: '/admin/leave/entitlement',
    // Admin requests
    requestCreate: '/admin/leave/request/create',
    requestList: '/admin/leave/request/list',
    requestGet: '/admin/leave/request/get',
    requestApprove: '/admin/leave/request/approve',
    requestReject: '/admin/leave/request/reject',
    requestChangeStatus: '/admin/leave/request/change-status',
    requestDelete: '/admin/leave/request/delete',
    requestConflicts: '/admin/leave/request',
    // Bradford factor
    bradford: '/admin/leave/bradford',
    // Calendar
    calendar: '/admin/leave/calendar',
    // Employee self-service
    employeeTypes: '/user/employee/leave/types',
    employeeBalance: '/user/employee/leave/balance',
    employeeMyRequests: '/user/employee/leave/my-requests',
    employeeRequest: '/user/employee/leave/request',
    employeeCancel: '/user/employee/leave/cancel',
    employeeCalculateDays: '/user/employee/leave/calculate-days',
  },
  contract: {
    // Template
    templateCreate: '/admin/contract/template/create',
    templateList: '/admin/contract/template/list',
    templateGet: '/admin/contract/template/get',
    templateUpdate: '/admin/contract/template/update',
    templateDelete: '/admin/contract/template/delete',
    // Section
    sectionCreate: '/admin/contract/section/create',
    sectionUpdate: '/admin/contract/section/update',
    sectionDelete: '/admin/contract/section/delete',
    sectionReorder: '/admin/contract/section/reorder',
    // Field
    fieldCreate: '/admin/contract/field/create',
    fieldUpdate: '/admin/contract/field/update',
    fieldDelete: '/admin/contract/field/delete',
    fieldReorder: '/admin/contract/field/reorder',
    // Employee contracts (admin)
    issue: '/admin/contract/issue',
    list: '/admin/contract/list',
    get: '/admin/contract/get',
    update: '/admin/contract/update',
    fieldValuesUpdate: '/admin/contract/field-values',
    delete: '/admin/contract/delete',
    // Employee self-service
    myContracts: '/user/employee/contract/my-contracts',
    employeeGet: '/user/employee/contract/get',
    employeeFieldValues: '/user/employee/contract/field-values',
    sign: '/user/employee/contract/sign',
    // Change status & Edit contract HTML
    changeStatus: '/admin/contract/change-status',
    updateHtml: '/admin/contract/update-html',
    // PDF & Clone
    downloadPdf: '/admin/contract/download-pdf',
    templateClone: '/admin/contract/template/clone',
  },
  attendance: {
    // Admin - Settings
    settings: '/admin/attendance/settings',
    settingsUpdate: '/admin/attendance/settings',
    // Admin - Import/Export
    export: '/admin/attendance/export',
    sampleCsv: '/admin/attendance/sample-csv',
    import: '/admin/attendance/import',
    // Admin - Records
    list: '/admin/attendance/list',
    get: '/admin/attendance/get',
    manual: '/admin/attendance/manual',
    update: '/admin/attendance/update',
    delete: '/admin/attendance/delete',
    // Admin - Reports
    reportMonthly: '/admin/attendance/report/monthly',
    reportAnnual: '/admin/attendance/report/annual',
    reportDaily: '/admin/attendance/report/daily',
    // Admin - Face-recognition kiosk
    faceRoster: '/admin/attendance/face-roster',
    faceIdentify: '/admin/attendance/face-identify',
    faceClock: '/admin/attendance/face-clock',
    // Employee self-service
    today: '/user/employee/attendance/today',
    myRecords: '/user/employee/attendance/my-records',
    clockIn: '/user/employee/attendance/clock-in',
    clockOut: '/user/employee/attendance/clock-out',
    breakStart: '/user/employee/attendance/break/start',
    breakEnd: '/user/employee/attendance/break/end',
    myReportMonthly: '/user/employee/attendance/report/monthly',
    myReportAnnual: '/user/employee/attendance/report/annual',
  },
  shift: {
    // Templates
    templateList: '/admin/shift/template/list',
    templateGet: '/admin/shift/template/get',
    templateCreate: '/admin/shift/template/create',
    templateUpdate: '/admin/shift/template/update',
    templateDelete: '/admin/shift/template/delete',
    // Assignments
    assignmentList: '/admin/shift/assignment/list',
    assignmentGet: '/admin/shift/assignment/get',
    assignmentCreate: '/admin/shift/assignment/create',
    assignmentUpdate: '/admin/shift/assignment/update',
    assignmentDelete: '/admin/shift/assignment/delete',
    // Rota builder
    rotaBulkAssign: '/admin/shift/rota/bulk-assign',
    rotaCopyWeek: '/admin/shift/rota/copy-week',
    rotaPublish: '/admin/shift/rota/publish',
    rotaCheckConflicts: '/admin/shift/rota/check-conflicts',
    rotaLeaves: '/admin/shift/rota/leaves',
    // Swap (admin)
    swapList: '/admin/shift/swap/list',
    swapDecide: '/admin/shift/swap/decide',
    // Employee self-service
    myShifts: '/user/employee/shift/my-shifts',
    employeeToday: '/user/employee/shift/today',
    mySwapRequests: '/user/employee/shift/swap/my-requests',
    swapRequest: '/user/employee/shift/swap/request',
    swapRespond: '/user/employee/shift/swap/respond',
    swapCancel: '/user/employee/shift/swap/cancel',
    swapColleagues: '/user/employee/shift/swap/colleagues',
  },
  companyLookup: {
    list: '/admin/company-lookup/list',
    create: '/admin/company-lookup/create',
    update: '/admin/company-lookup/update',
    delete: '/admin/company-lookup/delete',
  },
  companySettings: {
    settings: '/admin/company-settings/settings',
    uploadLogo: '/admin/company-settings/logo/upload',
    codeSettings: '/admin/company-settings/code-settings',
    testSmtp: '/admin/company-settings/test-smtp',

    setupStatus: '/admin/company-settings/setup-status',
    setupComplete: '/admin/company-settings/setup-complete',
  },
  notifications: {
    events: '/admin/notification/events',
    preferences: '/admin/notification/preferences',
    templates: '/admin/notification/templates',
  },
  messageLogs: {
    list: '/admin/message-log',
    get: '/admin/message-log',
  },
  payroll: {
    // Pay Schedules
    schedules: '/admin/payroll/schedules',
    schedule: '/admin/payroll/schedules',
    scheduleNextPeriod: '/admin/payroll/schedules', // /:id/next-period
    // Pay Elements
    elements: '/admin/payroll/elements',
    element: '/admin/payroll/elements',
    // Pay Runs
    runs: '/admin/payroll/runs',
    run: '/admin/payroll/runs',
    runCalculate: '/admin/payroll/runs', // /:id/calculate
    runApprove: '/admin/payroll/runs',   // /:id/approve
    runMarkPaid: '/admin/payroll/runs',  // /:id/mark-paid
    runRevert: '/admin/payroll/runs',    // /:id/revert
    runBankCsv: '/admin/payroll/runs',   // /:id/bank-csv
    // Payslips
    payslip: '/admin/payroll/payslips',
    payslipLineItems: '/admin/payroll/payslips', // /:id/line-items
    payslipLineItem: '/admin/payroll/payslips/line-items', // /:itemId
    payslipPdf: '/admin/payroll/payslips', // /:id/pdf
    // Employee self-service
    myPayslips: '/user/employee/payroll/my-payslips',
    myPayslipPdf: '/user/employee/payroll/my-payslips', // /:id/pdf
  },
  compliance: {
    // Dashboard
    dashboard: '/admin/compliance/dashboard',
    // Immigration
    immigrationList: '/admin/compliance/immigration/list',
    immigrationGet: '/admin/compliance/immigration/get',
    immigrationUser: '/admin/compliance/immigration/user',
    immigrationCreate: '/admin/compliance/immigration/create',
    immigrationUpdate: '/admin/compliance/immigration/update',
    immigrationDelete: '/admin/compliance/immigration/delete',
    immigrationExpiring: '/admin/compliance/immigration/expiring',
    // RTW Checks
    rtwList: '/admin/compliance/rtw/list',
    rtwGet: '/admin/compliance/rtw/get',
    rtwCreate: '/admin/compliance/rtw/create',
    rtwUpdate: '/admin/compliance/rtw/update',
    rtwDelete: '/admin/compliance/rtw/delete',
    // Compliance Events
    eventList: '/admin/compliance/event/list',
    eventGet: '/admin/compliance/event/get',
    eventCreate: '/admin/compliance/event/create',
    eventUpdate: '/admin/compliance/event/update',
    eventReport: '/admin/compliance/event/report',
    eventNotApplicable: '/admin/compliance/event/not-applicable',
    eventDelete: '/admin/compliance/event/delete',
    // Audit
    auditList: '/admin/compliance/audit/list',
    auditUser: '/admin/compliance/audit/user',
    // Settings
    settingsGet: '/admin/compliance/settings',
    settingsUpdate: '/admin/compliance/settings',
  },
}

// Per-module tile config for VoucherStatsTiles.
//
// Each module declares the API endpoint key (resolved against
// API_ENDPOINTS in the component) and a list of tile descriptors. The
// tile descriptor shape:
//
//   {
//     key:       unique id (also used to compute "active" highlighting)
//     label:     visible text under the number
//     color:     'info' | 'success' | 'warning' | 'danger' | 'secondary'
//                (maps to bootstrap bg-* / text-* classes)
//     statuses:  array of status enum values this tile represents.
//                Omit/empty for the Total / money tiles.
//     money:     name of the response field to render as money
//                (e.g. 'total_expected_value'). Omit for count tiles.
//     metric:    name of a top-level numeric field in the stats
//                response (e.g. 'follow_ups_overdue'). Use for
//                cross-cutting counts that aren't tied to a status.
//                Mutually exclusive with `statuses` and `money`.
//     icon:      react-feather icon name (e.g. 'Users', 'FileText').
//                Renders in a colored badge on the left of the tile.
//     subtitle:  optional small muted line under the number.
//   }
//
// Adding a new module = adding a new entry here + a `/stats` BE endpoint
// + the endpoint key in API_ENDPOINTS. No new FE component needed.

export const STATS_CONFIG = {
  customer: {
    endpointKey: "customers", // → API_ENDPOINTS.customers.stats
    tiles: [
      {
        key: "total",
        label: "Total Customers",
        icon: "Users",
        color: "info",
      },
      {
        key: "active",
        label: "Active",
        statuses: ["ACTIVE"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "inactive",
        label: "Inactive",
        statuses: ["INACTIVE"],
        icon: "XCircle",
        color: "secondary",
      },
      {
        key: "new_30d",
        label: "New (30 days)",
        metric: "new_30d",
        icon: "UserPlus",
        color: "warning",
      },
    ],
  },

  lead: {
    endpointKey: "leads", // → API_ENDPOINTS.leads.stats
    tiles: [
      {
        key: "total",
        label: "Total Leads",
        icon: "Users",
        color: "info",
      },
      {
        key: "won",
        label: "Won",
        statuses: ["won"],
        icon: "Award",
        color: "success",
      },
      {
        key: "pipeline",
        label: "In Pipeline",
        statuses: ["new", "contacted", "qualified", "proposal_sent"],
        icon: "TrendingUp",
        color: "warning",
      },
      {
        key: "lost",
        label: "Lost",
        statuses: ["lost"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  rfq: {
    endpointKey: "rfq", // → API_ENDPOINTS.rfq.stats
    tiles: [
      {
        key: "total",
        label: "Total RFQs",
        icon: "Send",
        color: "info",
      },
      {
        key: "completed",
        label: "Completed",
        statuses: ["completed"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "in_progress",
        label: "Draft + Sent + Quoting",
        statuses: ["draft", "sent", "quoting"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        statuses: ["cancelled"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  grn: {
    endpointKey: "grn", // → API_ENDPOINTS.grn.stats
    tiles: [
      {
        key: "total",
        label: "Total GRNs",
        icon: "Clipboard",
        color: "info",
      },
      {
        key: "confirmed",
        label: "Confirmed",
        statuses: ["confirmed"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "draft",
        label: "Draft",
        statuses: ["draft"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        statuses: ["cancelled"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  quotation: {
    endpointKey: "quotations", // → API_ENDPOINTS.quotations.stats
    tiles: [
      {
        key: "total",
        label: "Total",
        icon: "FileText",
        color: "info",
      },
      {
        key: "approved",
        label: "Approved",
        statuses: ["approved"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "pending",
        label: "Draft + Sent",
        statuses: ["draft", "sent"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "rejected",
        label: "Rejected",
        statuses: ["rejected"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  po: {
    endpointKey: "purchaseOrders", // → API_ENDPOINTS.purchaseOrders.stats
    tiles: [
      {
        key: "total",
        label: "Total",
        icon: "FileText",
        color: "info",
      },
      {
        key: "completed",
        label: "Completed",
        statuses: ["completed"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "open",
        label: "Confirmed + In Process",
        statuses: ["confirmed", "in_process"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        statuses: ["cancelled"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  po_vendor: {
    endpointKey: "poVendors", // → API_ENDPOINTS.poVendors.stats
    tiles: [
      {
        key: "total",
        label: "Total",
        icon: "Truck",
        color: "info",
      },
      {
        key: "closed",
        label: "Closed",
        statuses: ["closed"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "open",
        label: "Draft + Dispatched",
        statuses: ["draft", "dispatched"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        statuses: ["cancelled"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  invoice: {
    endpointKey: "invoices", // → API_ENDPOINTS.invoices.stats
    tiles: [
      {
        key: "total",
        label: "Total",
        icon: "FileText",
        color: "info",
      },
      {
        key: "draft",
        label: "Draft",
        statuses: ["draft"],
        icon: "Edit",
        color: "secondary",
      },
      {
        key: "outstanding",
        label: "Issued + Partially Paid",
        statuses: ["issued", "partially_paid"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "paid",
        label: "Paid",
        statuses: ["paid"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        statuses: ["cancelled"],
        icon: "XCircle",
        color: "danger",
      },
    ],
  },

  pfi: {
    endpointKey: "pfis", // → API_ENDPOINTS.pfis.stats
    tiles: [
      {
        key: "total",
        label: "Total",
        icon: "FileText",
        color: "info",
      },
      {
        key: "approved",
        label: "Approved",
        statuses: ["approved"],
        icon: "CheckCircle",
        color: "success",
      },
      {
        key: "pending",
        label: "Draft + Sent",
        statuses: ["draft", "sent"],
        icon: "Clock",
        color: "warning",
      },
      {
        key: "rejected",
        label: "Rejected",
        statuses: ["rejected"],
        icon: "XCircle",
        color: "danger",
      },
      {
        key: "value",
        label: "Pipeline Total Value",
        money: "total_amount_inr",
        icon: "TrendingUp",
        color: "secondary",
      },
    ],
  },
};

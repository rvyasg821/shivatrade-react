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
//   }
//
// Adding a new module = adding a new entry here + a `/stats` BE endpoint
// + the endpoint key in API_ENDPOINTS. No new FE component needed.

export const STATS_CONFIG = {
  lead: {
    endpointKey: "leads", // → API_ENDPOINTS.leads.stats
    tiles: [
      {
        key: "total",
        label: "Total Leads",
        color: "info",
      },
      {
        key: "won",
        label: "Won",
        statuses: ["won"],
        color: "success",
      },
      {
        key: "pipeline",
        label: "In Pipeline",
        statuses: ["new", "contacted", "qualified", "proposal_sent"],
        color: "warning",
      },
      {
        key: "lost",
        label: "Lost",
        statuses: ["lost"],
        color: "danger",
      },
    ],
  },
};

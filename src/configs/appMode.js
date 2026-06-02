// ============================================================================
//  Single-tenant (ShivaTrades) app-mode config
// ----------------------------------------------------------------------------
//  APP_MODE=single hides SaaS features (subscriptions/plans/agents/company
//  switcher) and the dropped HRM extras (tools/assessments/contracts/
//  documents/compliance/shift) from the UI — without deleting any code.
//  Flip REACT_APP_MODE=saas and rebuild to restore the full SaaS UI.
//
//  NOTE: nav `id`s below are the *resolved string values* of the slug
//  constants in src/constants/defaultValues.js — e.g. plansModuleSlug === 'plan'.
//  The Company nav item is keyed by the literal 'companyModuleSlug'.
// ============================================================================

export const APP_MODE = process.env.REACT_APP_MODE || 'single';

export const IS_SINGLE_TENANT = APP_MODE === 'single';

// Nav item ids to drop from the sidebar / horizontal menu when single-tenant.
export const HIDDEN_NAV_IDS = IS_SINGLE_TENANT
    ? [
          // ── SaaS group ──
          'subscriptions', // subscriptionsModuleSlug (parent group)
          'plan', // plansModuleSlug
          'discounts', // discountModuleSlug
          'subscription', // subscriptionModuleSlug
          'module', // paymentModuleSlug
          'agents', // agentModuleSlug
          'companyModuleSlug', // Company switcher nav item (keyed by literal)
          // ── Tools + HRM extras ──
          'tools', // toolsModuleSlug
          'assessment-forms',
          'contracts',
          'documents',
          'compliance',
          'shifts',
      ]
    : [];

// Route base paths to drop from the router when single-tenant. Matching is
// segment-aware (exact, or followed by '/') so e.g. hiding '/apps/company'
// does NOT also hide '/apps/company-settings' (which we keep).
export const HIDDEN_ROUTE_PATHS = IS_SINGLE_TENANT
    ? [
          // ── SaaS ──
          '/apps/subscription',
          '/apps/profile/subscription', // upgrade / payment / edit sub-routes
          '/apps/plans',
          '/apps/discount', // singular landing
          '/apps/discounts', // add / bulk-generate / edit
          '/apps/payment',
          '/apps/agents',
          '/apps/company', // switcher CRUD (NOT company-settings — segment-safe)
          // ── Tools + HRM extras ──
          '/apps/tools',
          '/apps/assessment-forms',
          '/apps/contracts',
          '/apps/documents',
          '/apps/compliance',
          '/apps/shifts',
      ]
    : [];

// Backend permission module-slugs to hide from the role-permission catalog UI.
// These are the *permission* slugs (e.g. 'company', 'shift'), which differ from
// some nav ids (the Company nav item is keyed 'companyModuleSlug'; payment's
// permission slug is 'module'). Backend catalog stays full — UI hides the rows,
// and rows stay in role state so saving a role preserves any existing grants.
export const HIDDEN_PERMISSION_SLUGS = IS_SINGLE_TENANT
    ? [
          // ── SaaS ──
          'company', // companyModuleSlug
          'plan', // plansModuleSlug
          'subscription', // subscriptionModuleSlug
          'discounts', // discountModuleSlug
          'module', // paymentModuleSlug (payment)
          'agents', // agentModuleSlug
          'agent', // alias, in case backend uses singular
          // ── Tools + HRM extras ──
          'tools', // toolsModuleSlug
          'document', // documentModuleSlug
          'contract', // contractModuleSlug
          'compliance', // complianceHrmModuleSlug
          'shift', // shiftModuleSlug
      ]
    : [];

/** True if a nav item with this id should be hidden. */
export const isHidden = (id) => HIDDEN_NAV_IDS.includes(id);

/** True if this backend permission module-slug should be hidden from the catalog UI. */
export const isPermissionSlugHidden = (slug) =>
    HIDDEN_PERMISSION_SLUGS.includes(slug);

/**
 * True if a route path should be hidden. Segment-aware: a hidden base of
 * '/apps/company' matches '/apps/company' and '/apps/company/edit/:id' but
 * NOT '/apps/company-settings'.
 */
export const isRouteHidden = (path) =>
    !!path &&
    HIDDEN_ROUTE_PATHS.some((p) => path === p || path.startsWith(p + '/'));

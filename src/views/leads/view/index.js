// Lead detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (sticky)  — avatar, title, status, quick actions, pipeline
//   2. KPI strip        — Expected Value | Quotations | Activities | Follow-up
//   3. Summary card     — About + Opportunity (chips + brief)
//   4. Two-panel row    — Activity (left) + Quotations (right)

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Phone,
  Mail,
  Edit,
  ArrowLeft,
  UserPlus,
  FileText,
  PlusCircle,
  User,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  Activity as ActivityIcon,
  Tag,
  Truck,
  Layers,
  Hash,
  X,
  Send,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { getLead, cleanLeadMessage, convertLead } from "@src/views/leads/store";
import { formatMoney } from "@src/utility/currency";
import { getCategoryDropdown } from "@src/views/categories/store";
import { getProductDropdown } from "@src/views/products/store";
import { getVendorDropdown } from "@src/views/vendors/store";
import Notification from "@components/toast/notification";
import { formatDate } from "@src/utility/dateFormat";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
  LEAD_SOURCE_OPTIONS,
} from "@constant/options";

import { Row, Col, Button, Table, Input } from "reactstrap";
import ReactPaginate from "react-paginate";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailFieldList,
  DetailSocials,
  DetailTwoPanel,
  DetailPanel,
  useFollowUpStatus,
} from "@src/views/_shared/detail-page";

import ActivityTab from "../ActivityTab";
import QuotationsPanel from "./QuotationsPanel";

const PIPELINE_STEPS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
];

const TERMINAL_STEPS = [{ value: "lost", label: "Lost", color: "danger" }];

const labelize = (val, opts) =>
  opts.find((o) => o.value === val)?.label || val || "-";

// Resolve an array of ids (or objects) to display names using a lookup table.
const resolveNames = (arr, lookup) =>
  (arr || [])
    .map((item) => {
      if (item && typeof item === "object") {
        return item.name || item.label || item.company_name;
      }
      return lookup?.[item] || null;
    })
    .filter(Boolean);

const ViewLead = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.lead);
  const quotationStore = useSelector((s) => s.quotation);
  const activityStore = useSelector((s) => s.leadActivity);
  const categoryStore = useSelector((s) => s.category);
  const productStore = useSelector((s) => s.product);
  const vendorStore = useSelector((s) => s.vendor);

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const leadPerms = authUserItem?.role?.permissions?.leads;
  const quotationPerms = authUserItem?.role?.permissions?.quotations;
  const customerPerms = authUserItem?.role?.permissions?.customers;
  const canEditLead =
    isAdmin || leadPerms?.can_all || leadPerms?.can_update;
  const canAddQuotation =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_add;
  const canConvertCustomer =
    isAdmin || customerPerms?.can_all || customerPerms?.can_add;

  // Activity composer visibility — collapsed by default. The header "+"
  // action opens it; submitting a note auto-collapses it again.
  const [showActivityComposer, setShowActivityComposer] = useState(false);

  // Pagination for the Requirement Items table (matches the quotation/SO
  // detail line-item tables).
  const [reqPage, setReqPage] = useState(0);
  const [reqPageSize, setReqPageSize] = useState(10);

  // Right-side Activity panel height tracks the left column's rendered
  // height so the two columns visually match. Excess feed scrolls inside.
  const leftColRef = useRef(null);
  const [leftHeight, setLeftHeight] = useState(null);
  useEffect(() => {
    const el = leftColRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLeftHeight(el.offsetHeight));
    ro.observe(el);
    setLeftHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const l = store?.leadItem || {};

  useEffect(() => {
    if (id) dispatch(getLead(id));
    dispatch(getCategoryDropdown());
    dispatch(getProductDropdown());
    dispatch(getVendorDropdown());
  }, [id, dispatch]);

  // ── Lookups (id → name) for chips ──
  const categoryNameById = useMemo(() => {
    const map = {};
    (categoryStore?.categoryDropdown || []).forEach((c) => {
      map[c._id] = c.name;
    });
    return map;
  }, [categoryStore?.categoryDropdown]);

  const productNameById = useMemo(() => {
    const map = {};
    (productStore?.productDropdown || []).forEach((p) => {
      map[p._id] = p.name || p.product_name;
    });
    return map;
  }, [productStore?.productDropdown]);

  const vendorNameById = useMemo(() => {
    const map = {};
    (vendorStore?.vendorDropdown || []).forEach((v) => {
      map[v._id] = v.vendor_code
        ? `${v.company_name} [${v.vendor_code}]`
        : v.company_name;
    });
    return map;
  }, [vendorStore?.vendorDropdown]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLeadMessage(null));
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  // ── Derived values ──
  const phone = useMemo(() => {
    const dial = l?.country_code?.dial_code || l?.country_code?.dialCode;
    if (l?.country_code?.formatted) return l.country_code.formatted;
    if (dial && l?.contact_phone) return `${dial} ${l.contact_phone}`;
    return l?.contact_phone || "";
  }, [l]);

  const cityLine = [l?.city, l?.state, l?.country].filter(Boolean).join(", ");
  const addressFull = [
    l?.address_line1,
    l?.address_line2,
    [l?.city, l?.state, l?.postcode].filter(Boolean).join(", "),
    l?.country,
  ]
    .filter(Boolean)
    .join("\n");

  const sourceLabel = labelize(l?.source, LEAD_SOURCE_OPTIONS);
  const statusLabel = labelize(l?.status, LEAD_STATUS_OPTIONS);

  const budget = l?.expected_value
    ? formatMoney(l.expected_value, l?.currency)
    : null;

  const followUp = useFollowUpStatus(l?.follow_up_date);

  const categoryChips = resolveNames(
    l?.interested_categories,
    categoryNameById
  );
  const productChips = resolveNames(l?.interested_products, productNameById);
  const vendorChips = resolveNames(l?.preferred_vendors, vendorNameById);

  const requirementLines = Array.isArray(l?.lines) ? l.lines : [];
  const reqTotal = requirementLines.length;
  const reqPageCount = Math.max(1, Math.ceil(reqTotal / reqPageSize));
  const reqSafePage = Math.min(reqPage, reqPageCount - 1);
  const reqStart = reqSafePage * reqPageSize;
  const reqPageLines = requirementLines.slice(reqStart, reqStart + reqPageSize);

  const quotationsCount = (quotationStore?.quotationItems || []).filter(
    (q) => q?.lead_id === id
  ).length;
  const activitiesCount = (activityStore?.items || []).length;

  const isLost = l?.status === "lost";
  const isWon = l?.status === "won";
  const isConverted = !!l?.converted_customer_id;

  // ── Actions ──
  const mySwal = withReactContent(Swal);
  const onConvert = () => {
    mySwal
      .fire({
        title: t("Convert to Customer?"),
        text: t(
          "A new customer will be created from this lead's company and contact details, and the lead will be linked to that customer."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, convert"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        const res = await dispatch(convertLead(id));
        const newCustomerId = res?.payload?.leadItem?.converted_customer_id;
        if (newCustomerId) {
          navigate(`${appsRoot}/customers/view/${newCustomerId}`);
        }
      });
  };

  // Don't create the RFQ here — open the RFQ builder in draft mode carrying
  // this lead's id. The RFQ record is only persisted when the user saves
  // prices on that page.
  const onCreateRfq = () => {
    navigate(`${appsRoot}/rfq/view/new?lead_id=${id}`);
  };

  const headerActions = [
    {
      icon: UserPlus,
      label: t("Convert to Customer"),
      onClick: onConvert,
      // Hide once a customer has been created from this lead — converting
      // again would create a duplicate.
      hidden: !isWon || !canConvertCustomer || isConverted,
      outline: false,
      color: "success",
    },
    ...(canEditLead
      ? [
          {
            icon: Edit,
            label: t("Edit"),
            onClick: () => navigate(`${appsRoot}/leads/edit/${id}`),
          },
        ]
      : []),
    {
      icon: ArrowLeft,
      label: t("Back to Leads"),
      onClick: () => navigate(-1),
    },
  ];

  const moreActions = [];

  const kpiItems = [
    {
      key: "value",
      label: t("Expected Value"),
      value: budget || "-",
      icon: DollarSign,
      tone: "secondary",
    },
    {
      key: "quotations",
      label: t("Quotations"),
      value: quotationsCount,
      icon: FileText,
      tone: "secondary",
    },
    {
      key: "activities",
      label: t("Activities"),
      value: activitiesCount,
      icon: ActivityIcon,
      tone: "success",
    },
    {
      key: "followup",
      label: t("Follow-up"),
      value: l?.follow_up_date ? formatDate(l.follow_up_date) : t("Not set"),
      sub: followUp.label,
      icon: Calendar,
      tone: followUp.tone,
    },
  ];

  // ── Summary field pairs ──
  // Three side-by-side rows: Contact Person | Email, Phone | Website,
  // Source | Address. Opportunity is rendered as its own block below.
  const pairs = [
    [
      { icon: User, label: t("Contact Person"), value: l?.contact_name },
      {
        icon: Mail,
        label: t("Email"),
        value: l?.contact_email ? (
          <a
            href={`mailto:${l.contact_email}`}
            className="text-reset text-decoration-none"
          >
            {l.contact_email}
          </a>
        ) : null,
      },
    ],
    [
      {
        icon: Phone,
        label: t("Phone"),
        value: phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="text-reset text-decoration-none"
          >
            {phone}
          </a>
        ) : null,
      },
      {
        icon: Globe,
        label: t("Website"),
        value: l?.website_url ? (
          <a
            href={
              /^https?:\/\//i.test(l.website_url)
                ? l.website_url
                : `https://${l.website_url}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-reset text-decoration-none"
          >
            {l.website_url}
          </a>
        ) : null,
      },
    ],
    [
      { icon: Tag, label: t("Source"), value: sourceLabel },
      {
        icon: MapPin,
        label: t("Address"),
        value: addressFull || cityLine || null,
      },
    ],
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={l?.company_name || l?.contact_name}
          title={l?.company_name || l?.contact_name || "-"}
          subtitle={
            [l?.contact_name, l?.contact_email].filter(Boolean).join(" · ") ||
            null
          }
          meta={
            l?.voucher_no
              ? l.voucher_no
              : l?._id
              ? `${t("Lead ID")}: #${l._id.slice(-8).toUpperCase()}`
              : null
          }
          badge={{
            label: statusLabel,
            color: "secondary",
          }}
          actions={headerActions}
          moreActions={moreActions}
          belowSlot={
            <DetailPipeline
              steps={PIPELINE_STEPS}
              current={l?.status}
              terminalSteps={TERMINAL_STEPS}
            />
          }
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={
            <div ref={leftColRef}>
              <QuotationsPanel />
              {requirementLines.length > 0 && (
                <DetailPanel
                  title={t("Requirement Items")}
                  action={
                    <Button
                      color="primary"
                      size="sm"
                      onClick={onCreateRfq}
                      id="lead-create-rfq-btn"
                    >
                      <Send size={14} className="me-50" />
                      {t("Create RFQ")}
                    </Button>
                  }
                >
                    <div className="table-responsive mb-1">
                      <Table size="sm" bordered className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th>{t("Product")}</th>
                            <th className="text-end">{t("Qty")}</th>
                            <th>{t("Unit")}</th>
                            <th className="text-end">{t("Price")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reqPageLines.map((ln, i) => (
                            <tr key={ln._id || reqStart + i}>
                              <td>{reqStart + i + 1}</td>
                              <td>
                                <div className="fw-semibold">
                                  {ln.product_name || ln.product_code || "-"}
                                </div>
                                {ln.product_name && ln.product_code ? (
                                  <div className="text-muted small">
                                    {ln.product_code}
                                  </div>
                                ) : null}
                                {ln.description ? (
                                  <div className="text-muted small">
                                    {ln.description}
                                  </div>
                                ) : null}
                              </td>
                              <td className="text-end">
                                {ln.qty != null && ln.qty !== ""
                                  ? Number(ln.qty).toLocaleString()
                                  : "-"}
                              </td>
                              <td>{ln.unit || "-"}</td>
                              <td className="text-end">
                                {ln.unit_price != null &&
                                ln.unit_price !== "" &&
                                Number(ln.unit_price) > 0
                                  ? formatMoney(ln.unit_price, "INR")
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-1">
                      <div className="d-flex align-items-center small text-muted">
                        <span className="me-50">{t("Show")}</span>
                        <Input
                          type="select"
                          bsSize="sm"
                          value={reqPageSize}
                          onChange={(e) => {
                            setReqPageSize(Number(e.target.value) || 10);
                            setReqPage(0);
                          }}
                          style={{ width: 80 }}
                        >
                          {[10, 25, 50, 100].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </Input>
                        <span className="ms-50">
                          {t("of")} {reqTotal} {t("rows")}
                        </span>
                      </div>
                      <ReactPaginate
                        previousLabel=""
                        nextLabel=""
                        pageCount={reqPageCount}
                        activeClassName="active"
                        forcePage={reqSafePage}
                        onPageChange={({ selected }) => setReqPage(selected)}
                        pageClassName="page-item"
                        nextLinkClassName="page-link"
                        nextClassName="page-item next"
                        previousClassName="page-item prev"
                        previousLinkClassName="page-link"
                        pageLinkClassName="page-link"
                        containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
                      />
                    </div>
                </DetailPanel>
              )}
            </div>
          }
          right={
            <div style={{ height: leftHeight ? `${leftHeight}px` : undefined }}>
            <DetailPanel
              fill
              className="lead-activity-panel"
              title={t("Activity")}
              action={
                canEditLead && (
                <Button
                  color={showActivityComposer ? "secondary" : "primary"}
                  outline={showActivityComposer}
                  size="sm"
                  onClick={() => setShowActivityComposer((v) => !v)}
                  id="lead-activity-add-btn"
                >
                  {showActivityComposer ? (
                    <>
                      <X size={14} className="me-50" />
                      {t("Close")}
                    </>
                  ) : (
                    <>
                      <PlusCircle size={14} className="me-50" />
                      {t("Add")}
                    </>
                  )}
                </Button>
                )
              }
            >
              {/* Pinned to the left column's measured height (set on the
                  wrapper div around this panel) so the two sides match;
                  feed scrolls internally when it exceeds that height. */}
              <div
                className="lead-activity-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  paddingRight: 12,
                }}
              >
                <ActivityTab
                  leadId={id}
                  showComposer={showActivityComposer && canEditLead}
                  onComposerClose={() => setShowActivityComposer(false)}
                  canManage={canEditLead}
                />
              </div>
            </DetailPanel>
            </div>
          }
        />
      </div>
    </Fragment>
  );
};

export default ViewLead;

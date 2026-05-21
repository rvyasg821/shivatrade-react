// Lead detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (sticky)  — avatar, title, status, quick actions, pipeline
//   2. KPI strip        — Expected Value | Quotations | Activities | Follow-up
//   3. Summary card     — About + Opportunity (chips + brief)
//   4. Two-panel row    — Activity (left) + Quotations (right)

import { Fragment, useEffect, useMemo } from "react";
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
} from "react-feather";
import { useTranslation } from "react-i18next";

import { getLead, cleanLeadMessage, convertLead } from "@src/views/leads/store";
import { formatMoney } from "@src/utility/currency";
import { getCategoryDropdown } from "@src/views/categories/store";
import { getProductDropdown } from "@src/views/products/store";
import { getVendorDropdown } from "@src/views/vendors/store";
import Notification from "@components/toast/notification";
import { formatDate } from "@src/utility/dateFormat";
import { appsRoot } from "@constant/defaultValues";
import {
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
  LEAD_SOURCE_OPTIONS,
} from "@constant/options";

import { Row, Col } from "reactstrap";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailFieldList,
  DetailChips,
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

  const quotationsCount = (quotationStore?.quotationItems || []).filter(
    (q) => q?.lead_id === id
  ).length;
  const activitiesCount = (activityStore?.items || []).length;

  const isLost = l?.status === "lost";
  const isWon = l?.status === "won";
  const isConverted = !!l?.converted_customer_id;

  // ── Actions ──
  const onConvert = async () => {
    if (!window.confirm(t("Convert this lead to a customer?"))) return;
    const res = await dispatch(convertLead(id));
    const newCustomerId = res?.payload?.leadItem?.converted_customer_id;
    if (newCustomerId) {
      navigate(`${appsRoot}/customers/view/${newCustomerId}`);
    }
  };

  const headerActions = [
    {
      icon: PlusCircle,
      label: t("Quotation"),
      onClick: () => navigate(`${appsRoot}/quotations/add?lead_id=${id}`),
      hidden: isLost,
      outline: false,
    },
    {
      icon: UserPlus,
      label: t("Convert to Customer"),
      onClick: onConvert,
      hidden: !isWon || isConverted,
      outline: false,
      color: "success",
    },
    {
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/leads/edit/${id}`),
    },
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
            l?._id ? `${t("Lead ID")}: #${l._id.slice(-8).toUpperCase()}` : null
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
            <Fragment>
              <QuotationsPanel />
              <DetailPanel title={t("Lead Summary")}>
                {pairs.map((row, idx) => (
                  <Row key={idx} className="g-2">
                    {row.map((f) => (
                      <Col md="6" key={f.label}>
                        <DetailFieldList items={[f]} />
                      </Col>
                    ))}
                  </Row>
                ))}

                <h5 className="fw-bolder border-bottom pb-50 mb-1 mt-1">
                  {t("Opportunity")}
                </h5>
                <Row className="g-2">
                  <Col md="6">
                    <DetailFieldList
                      items={[
                        {
                          icon: DollarSign,
                          label: t("Expected Value"),
                          value: budget,
                        },
                      ]}
                    />
                  </Col>
                  <Col md="6">
                    <DetailChips
                      title={t("Interested Categories")}
                      items={categoryChips}
                      bg="#eef0f3"
                      fg="#1a2238"
                    />
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md="6">
                    <DetailFieldList
                      items={[
                        {
                          icon: Calendar,
                          label: t("Follow-up Date"),
                          value: l?.follow_up_date
                            ? formatDate(l.follow_up_date)
                            : null,
                        },
                      ]}
                    />
                  </Col>
                  <Col md="6">
                    <DetailChips
                      title={t("Interested Products")}
                      items={productChips}
                      bg="#eef0f3"
                      fg="#1a2238"
                    />
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md="6">
                    <DetailFieldList
                      items={[
                        {
                          icon: Layers,
                          label: t("Quantity"),
                          value: l?.quantity,
                        },
                      ]}
                    />
                  </Col>
                  <Col md="6">
                    <DetailFieldList
                      items={[
                        {
                          icon: Truck,
                          label: t("Delivery Expectation"),
                          value: l?.delivery_expectation,
                        },
                      ]}
                    />
                  </Col>
                </Row>

                <DetailSocials
                  title={t("Social")}
                  urls={l?.social_media_urls || {}}
                />

                {l?.description ? (
                  <div className="mt-1 pt-1 border-top">
                    <div className="text-muted small mb-50">
                      {t("Brief / Description")}
                    </div>
                    <div
                      className="text-break"
                      style={{
                        whiteSpace: "pre-line",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {l.description}
                    </div>
                  </div>
                ) : null}
              </DetailPanel>
            </Fragment>
          }
          right={
            <DetailPanel title={t("Activity")}>
              <ActivityTab leadId={id} />
            </DetailPanel>
          }
        />
      </div>
    </Fragment>
  );
};

export default ViewLead;

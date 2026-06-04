// RFQ detail — vendor price comparison grid (lines × vendors), select best.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Row,
  Col,
  Table,
  Input,
  Button,
  Badge,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { ArrowLeft, Plus, X, Download, Save, FileText } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getRfq,
  setRfqPrices,
  selectRfqPrice,
  addRfqVendors,
  removeRfqVendor,
  createRfqFromLead,
  cleanRfqMessage,
} from "../store";
import { getLead } from "@src/views/leads/store";
import { getVendorDropdown } from "@src/views/vendors/store";
import { stopLoading } from "../../loadingstore";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";

const STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  quoting: "warning",
  completed: "success",
  cancelled: "danger",
};
const key = (lineId, vendorId) => `${lineId}|${vendorId}`;

const RfqView = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // Draft mode: the RFQ record is NOT created until the operator saves prices.
  // We reach this page from a lead via /rfq/view/new?lead_id=<id>; the grid is
  // built from the lead's requirement items + locally-added vendors, and only
  // "Save Prices" persists the RFQ (createFromLead + setPrices in one shot).
  const isDraft = id === "new";
  const leadIdParam = searchParams.get("lead_id");

  const store = useSelector((s) => s.rfq);
  const vendorStore = useSelector((s) => s.vendor);
  const leadStore = useSelector((s) => s.lead);
  const rfq = store?.rfqItem;
  const draftLead = isDraft ? leadStore?.leadItem : null;

  const [priceMap, setPriceMap] = useState({});
  const [addVendorId, setAddVendorId] = useState("");
  const [draftVendors, setDraftVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    // Clear any global overlay left on by the list page; the detail page
    // shows its own local spinner while the RFQ loads.
    dispatch(stopLoading());
    dispatch(getVendorDropdown());
    if (isDraft) {
      if (leadIdParam) dispatch(getLead(leadIdParam));
    } else {
      dispatch(getRfq(id));
    }
  }, [id, dispatch]);

  // Seed the editable grid from the RFQ's stored prices whenever it loads.
  // Skipped in draft mode (no RFQ yet — the operator types fresh prices).
  useEffect(() => {
    if (isDraft || !rfq?.prices) return;
    const m = {};
    for (const p of rfq.prices) {
      m[key(p.rfq_line_id, p.vendor_id)] = String(p.unit_price ?? "");
    }
    setPriceMap(m);
  }, [rfq?._id, rfq?.prices?.length]);

  useEffect(() => {
    // "Best price selected" fires per line; with auto-select-cheapest that
    // would stack a toast for every line. The green highlight is feedback
    // enough, so suppress the success toast for the select action (RFQ_SEL).
    if (store?.success && store?.actionFlag !== "RFQ_SEL") {
      Notification("Success", store.success, "success");
    }
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanRfqMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  // In draft mode the rows come straight from the lead's requirement items
  // (keyed by the lead-line _id) and vendors live in local state.
  const lines = isDraft
    ? (draftLead?.lines || []).map((l) => ({
        _id: l._id,
        product_id: l.product_id,
        product_name: l.product_name,
        product_code: l.product_code,
        qty: l.qty,
        unit: l.unit,
      }))
    : rfq?.lines || [];
  const vendors = isDraft ? draftVendors : rfq?.vendors || [];

  // Client-side pagination for the comparison grid — mirrors the
  // quotation detail's line-item table.
  const totalLines = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalLines / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = lines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  // selected vendor per line (for the "Best" radio)
  const selectedByLine = useMemo(() => {
    const m = {};
    if (isDraft) return m;
    for (const p of rfq?.prices || []) {
      if (p.is_selected) m[p.rfq_line_id] = p.vendor_id;
    }
    return m;
  }, [rfq?.prices, isDraft]);

  // Cheapest vendor per line, computed live from the editable grid. Drives
  // the "Best" auto-default so the operator doesn't have to pick manually.
  const cheapestByLine = useMemo(() => {
    const best = {};
    for (const l of lines) {
      let bestVendor = null;
      let bestPrice = Infinity;
      for (const v of vendors) {
        const raw = priceMap[key(l._id, v.vendor_id)];
        if (raw === undefined || String(raw).trim() === "") continue;
        const p = Number(raw);
        if (Number.isFinite(p) && p > 0 && p < bestPrice) {
          bestPrice = p;
          bestVendor = v.vendor_id;
        }
      }
      if (bestVendor) best[l._id] = bestVendor;
    }
    return best;
  }, [lines, vendors, priceMap]);

  // Auto-select the cheapest vendor for any line that has SAVED prices but no
  // pick yet. Keyed on the server prices so it fires after a save/load (not on
  // every keystroke); respects a manual pick and skips already-selected lines.
  // The ref guards against re-dispatching while a select is still in flight.
  const autoSelectedRef = useRef(new Set());
  useEffect(() => {
    if (isDraft) return;
    const prices = rfq?.prices;
    if (!prices?.length) return;
    const best = {};
    const selected = {};
    for (const p of prices) {
      if (p.is_selected) selected[p.rfq_line_id] = true;
      const price = Number(p.unit_price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const cur = best[p.rfq_line_id];
      if (!cur || price < cur.price) {
        best[p.rfq_line_id] = { vendorId: p.vendor_id, price };
      }
    }
    for (const lid of Object.keys(best)) {
      if (selected[lid] || autoSelectedRef.current.has(lid)) continue;
      autoSelectedRef.current.add(lid);
      dispatch(
        selectRfqPrice({
          id,
          data: { rfq_line_id: lid, vendor_id: best[lid].vendorId },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?.prices]);

  const vendorOptions = (vendorStore?.vendorDropdown || [])
    .filter((v) => !vendors.some((rv) => rv.vendor_id === v._id))
    .map((v) => ({
      value: v._id,
      label: v.vendor_code ? `${v.company_name} [${v.vendor_code}]` : v.company_name,
    }));

  const onAddVendor = async () => {
    if (!addVendorId) return;
    if (!isDraft) {
      dispatch(addRfqVendors({ id, data: { vendor_ids: [addVendorId] } }));
      setAddVendorId("");
      return;
    }

    const vendorId = addVendorId;
    setAddVendorId("");
    if (draftVendors.some((v) => v.vendor_id === vendorId)) return;

    const opt = vendorOptions.find((o) => o.value === vendorId);
    setDraftVendors((prev) => [
      ...prev,
      {
        _id: vendorId,
        vendor_id: vendorId,
        vendor_name: opt?.label || vendorId,
      },
    ]);

    // Pre-fill this vendor's grid cells from the price list (current price per
    // product) — mirrors what the persisted addVendors flow does server-side.
    const productIds = Array.from(
      new Set(lines.map((l) => l.product_id).filter(Boolean))
    );
    if (!productIds.length) return;
    try {
      const resp = await instance.get(API_ENDPOINTS.priceList.currentPrices, {
        params: { vendor_id: vendorId, product_ids: productIds.join(",") },
      });
      const rows = resp?.data?.data || [];
      const byProduct = {};
      for (const r of rows) byProduct[r.product_id] = r.unit_price;
      setPriceMap((m) => {
        const next = { ...m };
        for (const l of lines) {
          const up = byProduct[l.product_id];
          const k = key(l._id, vendorId);
          if (up != null && (next[k] === undefined || next[k] === "")) {
            next[k] = String(up);
          }
        }
        return next;
      });
    } catch (e) {
      // Non-fatal — the operator can still type prices manually.
    }
  };

  const onRemoveVendor = (vendorId) => {
    if (isDraft) {
      setDraftVendors((prev) => prev.filter((v) => v.vendor_id !== vendorId));
    } else {
      dispatch(removeRfqVendor({ id, vendorId }));
    }
  };

  const collectPrices = () => {
    const prices = [];
    for (const l of lines) {
      for (const v of vendors) {
        const val = priceMap[key(l._id, v.vendor_id)];
        if (val !== undefined && String(val).trim() !== "") {
          // `lineRef` is the lead-line _id in draft mode (mapped to the real
          // rfq_line_id after creation) and the rfq_line_id otherwise.
          prices.push({
            lineRef: l._id,
            vendor_id: v.vendor_id,
            unit_price: String(val),
          });
        }
      }
    }
    return prices;
  };

  const onSavePrices = async () => {
    const collected = collectPrices();
    if (!collected.length) {
      Notification("Validation", t("Enter at least one price."), "warning");
      return;
    }

    if (isDraft) {
      if (!leadIdParam) {
        Notification("Error", t("Missing lead reference."), "warning");
        return;
      }
      setSaving(true);
      try {
        const res = await dispatch(
          createRfqFromLead({
            leadId: leadIdParam,
            data: { vendor_ids: vendors.map((v) => v.vendor_id) },
          })
        ).unwrap();
        const newRfq = res?.rfqItem;
        if (!newRfq?._id) {
          Notification(
            "Error",
            res?.error || t("Could not create the RFQ."),
            "warning"
          );
          return;
        }
        // Map each draft price's lead-line ref to the freshly-created
        // rfq_line_id (the new lines carry lead_line_id back).
        const lineByLead = {};
        for (const rl of newRfq.lines || []) {
          if (rl.lead_line_id) lineByLead[rl.lead_line_id] = rl._id;
        }
        const mapped = collected
          .map((p) => ({
            rfq_line_id: lineByLead[p.lineRef],
            vendor_id: p.vendor_id,
            unit_price: p.unit_price,
          }))
          .filter((p) => p.rfq_line_id);
        if (mapped.length) {
          await dispatch(
            setRfqPrices({ id: newRfq._id, data: { prices: mapped } })
          ).unwrap();
        }
        navigate(`${appsRoot}/rfq/view/${newRfq._id}`);
      } catch (e) {
        Notification("Error", t("Could not create the RFQ."), "warning");
      } finally {
        setSaving(false);
      }
      return;
    }

    dispatch(
      setRfqPrices({
        id,
        data: {
          prices: collected.map((p) => ({
            rfq_line_id: p.lineRef,
            vendor_id: p.vendor_id,
            unit_price: p.unit_price,
          })),
        },
      })
    );
  };

  const onSelectBest = (lineId, vendorId) => {
    // Selection is persisted server-side; in draft there's no RFQ yet, so the
    // cheapest highlight is read-only until the RFQ is saved.
    if (isDraft) return;
    dispatch(selectRfqPrice({ id, data: { rfq_line_id: lineId, vendor_id: vendorId } }));
  };

  const downloadPdf = (vendorId) => {
    const url = `${API_ENDPOINTS.rfq.pdf}/${id}/pdf${vendorId ? `?vendor_id=${vendorId}` : ""}`;
    setPdfLoading(true);
    instance
      .get(url, { responseType: "blob" })
      .then((resp) => {
        const blob = new Blob([resp.data], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `RFQ-${rfq?.voucher_no || id}.pdf`;
        link.click();
      })
      .catch(() =>
        Notification("Error", t("Could not generate the PDF."), "warning")
      )
      .finally(() => setPdfLoading(false));
  };

  if (isDraft ? leadIdParam && !draftLead : !rfq) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  // Header display values — sourced from the lead in draft mode, from the
  // persisted RFQ otherwise.
  const headerVoucher = isDraft ? t("New RFQ") : rfq.voucher_no || t("RFQ");
  const headerStatus = isDraft ? "draft" : rfq.status;
  const leadCompany = isDraft ? draftLead?.company_name : rfq.lead_company_name;
  const leadVoucher = isDraft ? draftLead?.voucher_no : rfq.lead_voucher_no;
  const leadContact = isDraft ? draftLead?.contact_name : rfq.lead_contact_name;
  const leadEmail = isDraft ? draftLead?.contact_email : rfq.lead_contact_email;
  const leadPhone = isDraft ? draftLead?.contact_phone : rfq.lead_contact_phone;

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody className="d-flex flex-wrap justify-content-between align-items-start gap-1">
          <div>
            <h4 className="mb-0">
              {headerVoucher}{" "}
              <Badge
                color={`light-${STATUS_COLOR[headerStatus] || "secondary"}`}
                className="text-capitalize ms-1"
              >
                {headerStatus}
              </Badge>
            </h4>
            {(leadCompany || leadVoucher || leadContact) && (
              <div className="mt-50">
                <div className="text-uppercase text-muted fw-bold" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                  {t("Lead Details")}
                </div>
                {leadCompany && (
                  <div className="fw-semibold text-capitalize mt-25">
                    {leadCompany}
                  </div>
                )}
                <div className="text-muted small d-flex flex-wrap gap-1">
                  {leadVoucher && (
                    <span>
                      {t("Lead")}: {leadVoucher}
                    </span>
                  )}
                  {leadContact && (
                    <span className="text-capitalize">· {leadContact}</span>
                  )}
                  {leadEmail && <span>· {leadEmail}</span>}
                  {leadPhone && <span>· {leadPhone}</span>}
                </div>
              </div>
            )}
          </div>
          <div className="d-flex gap-1">
            {!isDraft && Object.keys(selectedByLine).length > 0 && (
              <Button
                color="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `${appsRoot}/quotations/add?rfq_id=${id}` +
                      (rfq.lead_id ? `&lead_id=${rfq.lead_id}` : "")
                  )
                }
              >
                <FileText size={14} className="me-25" /> {t("Create Quotation")}
              </Button>
            )}
            {!isDraft && vendors.length > 0 && (
              <Button
                color="secondary"
                outline
                size="sm"
                onClick={() => downloadPdf()}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <>
                    <Spinner size="sm" className="me-25" /> {t("Generating…")}
                  </>
                ) : (
                  <>
                    <Download size={14} className="me-25" /> {t("Quote Request PDF")}
                  </>
                )}
              </Button>
            )}
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() => navigate(`${appsRoot}/rfq`)}
            >
              <ArrowLeft size={14} /> {t("Back")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Vendors */}
      <Card className="mb-1">
        <CardHeader>
          <CardTitle tag="h6" className="mb-0">
            {t("Invited Vendors")}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Row className="g-1 align-items-end">
            <Col md="5">
              <Select
                classNamePrefix="select"
                options={vendorOptions}
                value={vendorOptions.find((o) => o.value === addVendorId) || null}
                onChange={(opt) => setAddVendorId(opt?.value || "")}
                placeholder={t("Add a vendor…")}
              />
            </Col>
            <Col md="auto">
              <Button color="primary" size="sm" onClick={onAddVendor} disabled={!addVendorId}>
                <Plus size={14} className="me-25" /> {t("Add")}
              </Button>
            </Col>
          </Row>
          <div className="d-flex flex-wrap gap-1 mt-1">
            {vendors.map((v) => (
              <Badge key={v._id} color="light-primary" className="d-flex align-items-center">
                {v.vendor_name || v.vendor_id}
                <X
                  size={13}
                  className="ms-50 cursor-pointer"
                  onClick={() => onRemoveVendor(v.vendor_id)}
                />
              </Badge>
            ))}
            {vendors.length === 0 && (
              <span className="text-muted small">{t("No vendors invited yet.")}</span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Comparison grid */}
      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center">
          <CardTitle tag="h6" className="mb-0">
            {t("Price Comparison")}
          </CardTitle>
          {vendors.length > 0 && lines.length > 0 && (
            <Button
              color="primary"
              size="sm"
              onClick={onSavePrices}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="me-25" /> {t("Saving…")}
                </>
              ) : (
                <>
                  <Save size={14} className="me-25" />{" "}
                  {isDraft ? t("Save Prices & Create RFQ") : t("Save Prices")}
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardBody className="px-0">
          {vendors.length === 0 ? (
            <div className="text-center text-muted py-3">
              {t("Add at least one vendor to capture prices.")}
            </div>
          ) : (
            <div className="table-responsive">
              <Table bordered size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th style={{ minWidth: 200 }}>{t("Item")}</th>
                    <th className="text-end" style={{ width: 100 }}>
                      {t("Qty")}
                    </th>
                    {vendors.map((v) => (
                      <th key={v._id} className="text-center" style={{ minWidth: 120 }}>
                        {v.vendor_name || v.vendor_id}
                      </th>
                    ))}
                    <th className="text-center" style={{ width: 220, minWidth: 220 }}>
                      {t("Best")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLines.map((l, i) => (
                    <tr key={l._id}>
                      <td>{pageStart + i + 1}</td>
                      <td>
                        <div className="fw-semibold">
                          {l.product_name || "-"}
                        </div>
                        {l.product_code && (
                          <div className="text-muted small">{l.product_code}</div>
                        )}
                      </td>
                      <td className="text-end">
                        {l.qty} {l.unit || ""}
                      </td>
                      {vendors.map((v) => {
                        const k = key(l._id, v.vendor_id);
                        const isBest =
                          (selectedByLine[l._id] || cheapestByLine[l._id]) ===
                          v.vendor_id;
                        return (
                          <td key={v._id} className={isBest ? "table-success" : ""}>
                            <Input
                              type="number"
                              bsSize="sm"
                              className="text-end"
                              style={{ fontSize: "inherit" }}
                              min="0"
                              step="any"
                              value={priceMap[k] ?? ""}
                              onChange={(e) =>
                                setPriceMap((m) => ({ ...m, [k]: e.target.value }))
                              }
                            />
                          </td>
                        );
                      })}
                      <td className="text-center">
                        <Input
                          type="select"
                          bsSize="sm"
                          disabled={isDraft}
                          value={
                            selectedByLine[l._id] || cheapestByLine[l._id] || ""
                          }
                          onChange={(e) =>
                            e.target.value && onSelectBest(l._id, e.target.value)
                          }
                        >
                          <option value="">—</option>
                          {vendors
                            .filter(
                              (v) =>
                                priceMap[key(l._id, v.vendor_id)] !== undefined &&
                                String(priceMap[key(l._id, v.vendor_id)]).trim() !==
                                  ""
                            )
                            .map((v) => (
                              <option key={v._id} value={v.vendor_id}>
                                {v.vendor_name || v.vendor_id}
                              </option>
                            ))}
                        </Input>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {totalLines > 0 && (
                <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 px-1 gap-1">
                  <div className="d-flex align-items-center small text-muted">
                    <span className="me-50">{t("Show")}</span>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) || 10);
                        setPage(0);
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
                      {t("of")} {totalLines} {t("rows")}
                    </span>
                  </div>
                  <ReactPaginate
                    previousLabel=""
                    nextLabel=""
                    pageCount={pageCount}
                    activeClassName="active"
                    forcePage={safePage}
                    onPageChange={({ selected }) => setPage(selected)}
                    pageClassName="page-item"
                    nextLinkClassName="page-link"
                    nextClassName="page-item next"
                    previousClassName="page-item prev"
                    previousLinkClassName="page-link"
                    pageLinkClassName="page-link"
                    containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
                  />
                </div>
              )}

              <div className="small text-muted mt-1 px-1">
                {t(
                  "Enter vendor prices, Save, then pick the Best price per line. Selecting best for every line completes the RFQ."
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default RfqView;

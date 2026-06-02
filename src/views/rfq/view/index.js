// RFQ detail — vendor price comparison grid (lines × vendors), select best.
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Plus, X, Download, Save } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getRfq,
  setRfqPrices,
  selectRfqPrice,
  addRfqVendors,
  removeRfqVendor,
  cleanRfqMessage,
} from "../store";
import { getVendorDropdown } from "@src/views/vendors/store";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

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

  const store = useSelector((s) => s.rfq);
  const vendorStore = useSelector((s) => s.vendor);
  const rfq = store?.rfqItem;

  const [priceMap, setPriceMap] = useState({});
  const [addVendorId, setAddVendorId] = useState("");

  useEffect(() => {
    dispatch(getRfq(id));
    dispatch(getVendorDropdown());
  }, [id, dispatch]);

  // Seed the editable grid from the RFQ's stored prices whenever it loads.
  useEffect(() => {
    if (!rfq?.prices) return;
    const m = {};
    for (const p of rfq.prices) {
      m[key(p.rfq_line_id, p.vendor_id)] = String(p.unit_price ?? "");
    }
    setPriceMap(m);
  }, [rfq?._id, rfq?.prices?.length]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanRfqMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const lines = rfq?.lines || [];
  const vendors = rfq?.vendors || [];

  // selected vendor per line (for the "Best" radio)
  const selectedByLine = useMemo(() => {
    const m = {};
    for (const p of rfq?.prices || []) {
      if (p.is_selected) m[p.rfq_line_id] = p.vendor_id;
    }
    return m;
  }, [rfq?.prices]);

  const vendorOptions = (vendorStore?.vendorDropdown || [])
    .filter((v) => !vendors.some((rv) => rv.vendor_id === v._id))
    .map((v) => ({
      value: v._id,
      label: v.vendor_code ? `${v.company_name} [${v.vendor_code}]` : v.company_name,
    }));

  const onAddVendor = () => {
    if (!addVendorId) return;
    dispatch(addRfqVendors({ id, data: { vendor_ids: [addVendorId] } }));
    setAddVendorId("");
  };

  const onSavePrices = () => {
    const prices = [];
    for (const l of lines) {
      for (const v of vendors) {
        const val = priceMap[key(l._id, v.vendor_id)];
        if (val !== undefined && String(val).trim() !== "") {
          prices.push({
            rfq_line_id: l._id,
            vendor_id: v.vendor_id,
            unit_price: String(val),
          });
        }
      }
    }
    if (!prices.length) {
      Notification("Validation", t("Enter at least one price."), "warning");
      return;
    }
    dispatch(setRfqPrices({ id, data: { prices } }));
  };

  const onSelectBest = (lineId, vendorId) =>
    dispatch(selectRfqPrice({ id, data: { rfq_line_id: lineId, vendor_id: vendorId } }));

  const downloadPdf = (vendorId) => {
    const url = `${API_ENDPOINTS.rfq.pdf}/${id}/pdf${vendorId ? `?vendor_id=${vendorId}` : ""}`;
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
      );
  };

  if (!rfq) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody className="d-flex flex-wrap justify-content-between align-items-center gap-1">
          <div>
            <h4 className="mb-0">
              {rfq.voucher_no || t("RFQ")}{" "}
              <Badge
                color={`light-${STATUS_COLOR[rfq.status] || "secondary"}`}
                className="text-capitalize ms-1"
              >
                {rfq.status}
              </Badge>
            </h4>
            <div className="text-muted small mt-25">
              {rfq.lead_voucher_no ? `${t("Lead")}: ${rfq.lead_voucher_no} · ` : ""}
              {rfq.rfq_date ? formatDate(rfq.rfq_date) : ""}
            </div>
          </div>
          <div className="d-flex gap-1">
            <Button color="secondary" outline size="sm" onClick={() => downloadPdf()}>
              <Download size={14} className="me-25" /> {t("Quote Request PDF")}
            </Button>
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
                  onClick={() => dispatch(removeRfqVendor({ id, vendorId: v.vendor_id }))}
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
            <Button color="primary" size="sm" onClick={onSavePrices}>
              <Save size={14} className="me-25" /> {t("Save Prices")}
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
                    <th className="text-center" style={{ width: 90 }}>
                      {t("Best")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l._id}>
                      <td>{i + 1}</td>
                      <td>
                        <div className="fw-semibold">
                          {l.product_name || l.product_code || "-"}
                        </div>
                        {l.description && (
                          <div className="text-muted small">{l.description}</div>
                        )}
                      </td>
                      <td className="text-end">
                        {l.qty} {l.unit || ""}
                      </td>
                      {vendors.map((v) => {
                        const k = key(l._id, v.vendor_id);
                        const isBest = selectedByLine[l._id] === v.vendor_id;
                        return (
                          <td key={v._id} className={isBest ? "table-success" : ""}>
                            <Input
                              type="number"
                              bsSize="sm"
                              className="text-end"
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
                          value={selectedByLine[l._id] || ""}
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

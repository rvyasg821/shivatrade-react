// ** React Imports
import { Fragment, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getContract,
  getContractAsEmployee,
  signContract,
  updateEmployeeFieldValues,
  clearContractMessages,
  clearContractItem,
} from "../store";

// ** Reactstrap Imports
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle,
  Badge, Button, Label, Input, Alert,
} from "reactstrap";

// ** i18n
import { useTranslation } from "react-i18next";

// ** Notification
import Notification from "@components/toast/notification";

// ** Icons
import { ArrowLeft, Save, CheckCircle, PenTool } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

const statusColors = {
  draft: "light-secondary",
  issued: "light-info",
  pending_signature: "light-warning",
  signed: "light-success",
  expired: "light-danger",
  terminated: "light-dark",
};

// ── Signature Pad ─────────────────────────────────────────────────────────────
const SignaturePad = ({ onSave, disabled }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const { t } = useTranslation();

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
  }, [disabled]);

  const draw = useCallback((e) => {
    if (!isDrawing.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  }, [disabled]);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL("image/png"));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
    return () => {
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        style={{
          border: "1px solid #ebe9f1",
          borderRadius: 6,
          background: "#fff",
          cursor: disabled ? "not-allowed" : "crosshair",
          display: "block",
          width: "100%",
          maxWidth: 600,
          touchAction: "none",
        }}
      />
      <div className="d-flex gap-1 mt-1">
        <Button size="sm" color="secondary" outline onClick={handleClear} disabled={disabled || !hasStrokes}>
          {t("Clear")}
        </Button>
        <Button size="sm" color="success" onClick={handleSave} disabled={disabled || !hasStrokes}>
          <CheckCircle size={13} className="me-1" />
          {t("Use This Signature")}
        </Button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ContractSign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((state) => state.contract);
  const contract = store?.contractItem;
  const isOwner = store?.isContractOwner === true;

  const [fieldValues, setFieldValues] = useState({});
  const [fieldEdited, setFieldEdited] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      // Try employee endpoint first — sets isContractOwner=true if this user is the assignee.
      // Falls back to admin endpoint so admins can view read-only.
      dispatch(getContractAsEmployee(id)).then((result) => {
        if (!result?.payload?.isContractOwner) {
          dispatch(getContract(id));
        }
      });
    }
    return () => dispatch(clearContractItem());
  }, [id]);

  useEffect(() => {
    if (contract?.field_values) {
      const vals = {};
      contract.field_values.forEach((fv) => {
        vals[fv.contract_field_id] = fv.value || "";
      });
      setFieldValues(vals);
      setFieldEdited(false);
    }
  }, [contract?._id]);

  useEffect(() => {
    if (store?.actionFlag === "EC_EFV_SCS") {
      Notification("Success", t("Changes saved"), "success");
      dispatch(getContract(id));
      dispatch(clearContractMessages());
      setFieldEdited(false);
    }
    if (store?.actionFlag === "EC_SGN_SCS") {
      Notification("Success", store.success || t("Contract signed successfully"), "success");
      dispatch(clearContractMessages());
      navigate(`${appsRoot}/contracts/view/${id}`, { replace: true });
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(clearContractMessages());
      setConfirming(false);
    }
  }, [store?.actionFlag, store?.error]);

  const handleFieldChange = (fieldId, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setFieldEdited(true);
  };

  const handleSaveFields = () => {
    const updates = Object.entries(fieldValues).map(([field_id, value]) => ({ field_id, value }));
    dispatch(updateEmployeeFieldValues({ id, updates }));
  };

  const handleSign = () => {
    if (!signatureData) {
      Notification("Warning", t("Please draw your signature first"), "warning");
      return;
    }
    setConfirming(false);
    dispatch(signContract({ id, signature_data: signatureData }));
  };

  if (!contract) {
    return <div className="text-center p-4">{t("Loading...")}</div>;
  }

  const isAlreadySigned = contract.status === "signed";
  const canSign = isOwner && ["issued", "pending_signature"].includes(contract.status);
  const requiresSignature = contract.requires_signature !== false;
  const isSubmitting = !store?.loading;

  // Extract header, content, footer and split at signature-placeholder for sign UI
  const { headerHtml, contractBodyHtml, footerHtml, hasSignaturePlaceholder } = (() => {
    if (!contract.rendered_html) return { headerHtml: "", contractBodyHtml: "", footerHtml: "", hasSignaturePlaceholder: false };
    const parsed = extractDocumentParts(contract.rendered_html);
    const idx = parsed.content.indexOf('<div class="signature-placeholder"');
    if (idx === -1) return { ...parsed, contractBodyHtml: parsed.content, hasSignaturePlaceholder: false };
    return { ...parsed, contractBodyHtml: parsed.content.substring(0, idx), hasSignaturePlaceholder: true };
  })();

  return (
    <Fragment>
      <div className="main-content contracts">
        {/* ── Page Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Contract Review & Sign")}</h3>
          <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
          </Button>
        </div>

        {/* ── Summary Card ── */}
        <Card className="mb-2">
          <CardHeader className="border-bottom py-1">
            <div className="d-flex align-items-center justify-content-between w-100">
              <CardTitle tag="h5" className="mb-0">{t("Contract Summary")}</CardTitle>
              <Badge color={statusColors[contract.status] || "light-secondary"}>
                {t(contract.status?.replace(/_/g, " ") || "—")}
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <Row>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("Issued At")}</small>
                <span className="fw-semibold">
                  {contract.issued_at
                    ? new Date(contract.issued_at).toLocaleDateString("en-GB")
                    : "—"}
                </span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("Effective Date")}</small>
                <span className="fw-semibold">
                  {contract.effective_date
                    ? new Date(contract.effective_date).toLocaleDateString("en-GB")
                    : "—"}
                </span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("End Date")}</small>
                <span className="fw-semibold">
                  {contract.end_date
                    ? new Date(contract.end_date).toLocaleDateString("en-GB")
                    : t("Permanent")}
                </span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("Signed At")}</small>
                <span className={`fw-semibold ${contract.signed_at ? "text-success" : "text-muted"}`}>
                  {contract.signed_at
                    ? new Date(contract.signed_at).toLocaleDateString("en-GB")
                    : "—"}
                </span>
              </Col>
            </Row>

            {contract.notes && (
              <div className="alert alert-light mb-0 mt-1 py-1">
                <strong>{t("Notes:")}</strong> {contract.notes}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Non-owner notice ── */}
        {!isOwner && (
          <Alert color="info" className="mb-2">
            {t("You are viewing this contract in read-only mode. Only the assigned employee can sign it.")}
          </Alert>
        )}

        {/* ── Contract Document ── */}
        <Card className="mb-2">
          <CardHeader className="border-bottom py-1">
            <CardTitle tag="h5" className="mb-0">{t("Contract Document")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            {/* Contract header — logo left, company name right */}
            {contract.rendered_html && headerHtml && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 0 12px",
                  borderBottom: "2px solid #333",
                  marginBottom: 24,
                }}
                dangerouslySetInnerHTML={{ __html: headerHtml }}
              />
            )}

            {/* Rich-text body — rendered up to (but not including) the signature placeholder */}
            {contract.rendered_html && (
              <div
                className="contract-rendered-body"
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.875rem",
                  lineHeight: 1.7,
                  color: "#333",
                }}
                dangerouslySetInnerHTML={{ __html: contractBodyHtml }}
              />
            )}

            {/* Legacy field values (contracts without rendered_html) */}
            {!contract.rendered_html && contract.field_values?.length > 0 && (
              <Row>
                {contract.field_values.map((fv) => {
                  const isReadOnly = isAlreadySigned || fv.is_auto_populated || fv.is_readonly;
                  return (
                    <Col md={6} sm={12} key={fv._id || fv.contract_field_id} className="mb-2">
                      <Label className="form-label d-flex align-items-center gap-1">
                        {fv.label || fv.contract_field_id}
                        {fv.is_required && <span className="text-danger">*</span>}
                        {fv.is_auto_populated && (
                          <Badge color="light-success" pill style={{ fontSize: "0.65rem" }}>{t("auto")}</Badge>
                        )}
                      </Label>
                      <Input
                        value={fieldValues[fv.contract_field_id] ?? fv.value ?? ""}
                        onChange={(e) => handleFieldChange(fv.contract_field_id, e.target.value)}
                        readOnly={isReadOnly}
                        className={isReadOnly ? "bg-light" : ""}
                        placeholder={fv.placeholder || ""}
                      />
                    </Col>
                  );
                })}
                {!isAlreadySigned && fieldEdited && (
                  <Col xs={12}>
                    <Button color="primary" size="sm" onClick={handleSaveFields} disabled={isSubmitting}>
                      <Save size={13} className="me-1" />
                      {t("Save Changes")}
                    </Button>
                  </Col>
                )}
              </Row>
            )}

            {/* ── Inline signature section — renders where the placeholder was ── */}
            {/* When signed: hasSignaturePlaceholder=false, full HTML renders with embedded image.
                When unsigned: split at placeholder, show sign pad here in its place.          */}
            {(contract.rendered_html ? hasSignaturePlaceholder : true) && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  border: "1px solid #ddd",
                  background: "#fafafa",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <p style={{ fontWeight: "bold", marginBottom: 8, fontSize: "0.875rem" }}>
                  {t("Employee Signature:")}
                </p>

                {/* Can sign — signature pad */}
                {canSign && requiresSignature && (
                  <div>
                    <p className="text-muted small mb-1">
                      <PenTool size={13} className="me-1" />
                      {t("Draw your signature below using your mouse or finger.")}
                    </p>
                    <SignaturePad onSave={(data) => setSignatureData(data)} disabled={fieldEdited} />
                    {signatureData && (
                      <div className="mt-2">
                        <small className="text-success d-block mb-1">
                          ✓ {t("Signature captured")}
                        </small>
                        <img
                          src={signatureData}
                          alt="Preview"
                          style={{ maxWidth: 300, border: "1px solid #28c76f", borderRadius: 6, background: "#fff" }}
                        />

                        {!fieldEdited && (
                          <div className="mt-2">
                            <p className="text-muted small mb-1">
                              {t("By signing, you confirm you have read and agree to the terms of this contract. This action cannot be undone.")}
                            </p>
                            <Button color="success" onClick={handleSign} disabled={isSubmitting}>
                              <CheckCircle size={14} className="me-1" />
                              {isSubmitting ? t("Signing...") : t("Confirm & Sign Contract")}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Can sign — no signature required (acknowledge only) */}
                {canSign && !requiresSignature && (
                  <div>
                    {!confirming ? (
                      <div className="d-flex align-items-center gap-3">
                        <p className="text-muted small mb-0">
                          {t("By confirming, you acknowledge that you have read this contract.")}
                        </p>
                        <Button color="warning" onClick={() => setConfirming(true)} className="ms-auto text-nowrap">
                          {t("Acknowledge")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Alert color="warning" className="py-1">
                          <strong>{t("Please confirm:")}</strong>{" "}
                          {t("I have read this contract and acknowledge its contents.")}
                        </Alert>
                        <div className="main-form-btn">
                          <div className="form-btn mt-2">
                            <Button
                              color="success"
                              onClick={() => dispatch(signContract({ id, signature_data: "" }))}
                              disabled={isSubmitting}
                            >
                              <CheckCircle size={14} className="me-1" />
                              {isSubmitting ? t("Submitting...") : t("Confirm Acknowledgement")}
                            </Button>
                          </div>
                          <div className="form-btn mt-2">
                            <Button color="secondary" outline onClick={() => setConfirming(false)}>
                              {t("Cancel")}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Read-only placeholder for non-owners (admins) on unsigned contracts */}
                {!isOwner && !isAlreadySigned && (
                  <div style={{ height: 60, borderBottom: "1px solid #999", width: 300 }} />
                )}
              </div>
            )}

            {/* Contract footer — centered, one line */}
            {contract.rendered_html && footerHtml && (
              <div
                style={{
                  textAlign: "center",
                  borderTop: "1px solid #ccc",
                  padding: "10px 0 0",
                  marginTop: 30,
                  fontSize: "11px",
                  color: "#777",
                }}
                dangerouslySetInnerHTML={{ __html: footerHtml }}
              />
            )}
          </CardBody>
        </Card>

        {/* ── Back ── */}
        <div className="main-form-btn">
          <div className="form-btn mt-2">
            <Button
              type="button"
              color="secondary"
              onClick={() => navigate(-1)}
            >
              {t("Back")}
            </Button>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

/**
 * Extract header, content, and footer parts from the full HTML document.
 * Returns inner HTML of each section for rendering in the web view.
 */
function extractDocumentParts(html) {
  if (!html) return { headerHtml: "", content: "", footerHtml: "" };
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  // Use marker-based extraction — split by known wrapper divs
  const headerStart = body.indexOf('<div class="page-header">');
  const contentStart = body.indexOf('<div class="content">');
  const footerStart = body.indexOf('<div class="page-footer">');

  if (contentStart === -1) return { headerHtml: "", content: body, footerHtml: "" };

  // Header inner HTML
  let headerHtml = "";
  if (headerStart !== -1 && contentStart > headerStart) {
    const afterTag = headerStart + '<div class="page-header">'.length;
    const beforeContent = body.lastIndexOf("</div>", contentStart);
    if (beforeContent > afterTag) {
      headerHtml = body.substring(afterTag, beforeContent).trim();
    }
  }

  // Content inner HTML
  const afterContentTag = contentStart + '<div class="content">'.length;
  let content = "";
  if (footerStart !== -1) {
    const beforeFooter = body.lastIndexOf("</div>", footerStart);
    content = body.substring(afterContentTag, beforeFooter > afterContentTag ? beforeFooter : footerStart).trim();
  } else {
    const lastDiv = body.lastIndexOf("</div>");
    content = body.substring(afterContentTag, lastDiv > afterContentTag ? lastDiv : undefined).trim();
  }

  // Footer inner HTML
  let footerHtml = "";
  if (footerStart !== -1) {
    const afterFooterTag = footerStart + '<div class="page-footer">'.length;
    const footerEnd = body.lastIndexOf("</div>");
    if (footerEnd > afterFooterTag) {
      footerHtml = body.substring(afterFooterTag, footerEnd).trim();
    }
  }

  return { headerHtml, content, footerHtml };
}

export default ContractSign;

// ** React Imports
import { Fragment, useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getContract, getContractAsEmployee, clearContractMessages, clearContractItem, updateContractHtml, changeContractStatus } from "../store";
import instance from "@src/utility/AxiosConfig";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Reactstrap Imports
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle,
  Badge, Button, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
  Input, Label, FormGroup,
} from "reactstrap";

// ** i18n
import { useTranslation } from "react-i18next";

// ** Notification
import Notification from "@components/toast/notification";

// ** Icons
import { ArrowLeft, Download, Edit2, Save, X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Type, RefreshCw } from "react-feather";

// ** Constant
import { appsRoot, storageTokenKeyName, hostRestApiUrl, hostRestApiPrefix } from "@constant/defaultValues";

// ** API
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const statusColors = {
  draft: "light-secondary",
  issued: "light-info",
  pending_signature: "light-warning",
  signed: "light-success",
  expired: "light-danger",
  terminated: "light-dark",
};

const ContractView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((state) => state.contract);
  const authStore = useSelector((state) => state.auth);
  const contract = store?.contractItem;
  const isEmployee = authStore?.authUserItem?.role?.name === "Employee";
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const editorRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  // Status change
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Fetch current company logo
  useEffect(() => {
    if (isEmployee) return;
    instance.get(API_ENDPOINTS.companySettings.settings)
      .then((res) => {
        const logoPath = res.data?.data?.logo_url;
        if (logoPath) {
          setCompanyLogoUrl(logoPath.startsWith("http") ? logoPath : `${hostRestApiUrl}${logoPath}`);
        }
      })
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      dispatch(isEmployee ? getContractAsEmployee(id) : getContract(id));
    }
    return () => dispatch(clearContractItem());
  }, [id]);

  useEffect(() => {
    if (store?.actionFlag === "EC_EMP_GET_ERR" && isEmployee) {
      Notification("Error", t("You do not have permission to view this contract"), "warning");
      dispatch(clearContractMessages());
      navigate(`${appsRoot}/contracts`);
    } else if (store?.actionFlag === "EC_HTML_SCS") {
      Notification("Success", t("Contract updated successfully"), "success");
      setEditing(false);
      dispatch(clearContractMessages());
      dispatch(getContract(id));
    } else if (store?.actionFlag === "EC_STATUS_SCS") {
      Notification("Success", store.success || t("Contract status changed"), "success");
      setStatusModal(false);
      setNewStatus("");
      dispatch(clearContractMessages());
      dispatch(getContract(id));
    } else if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(clearContractMessages());
    }
  }, [store?.error, store?.actionFlag]);

  const handleDownloadPdf = async () => {
    try {
      const raw = localStorage.getItem(storageTokenKeyName);
      const token = raw ? JSON.parse(raw) : null;
      const res = await fetch(`${hostRestApiUrl}${hostRestApiPrefix}${API_ENDPOINTS.contract.downloadPdf}/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { Notification("Error", t("PDF download failed"), "warning"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contract-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("PDF download failed"), "warning");
    }
  };

  const handleStartEdit = () => {
    setEditing(true);
    // Wait for DOM then set content (uncontrolled — no React state for content)
    setTimeout(() => {
      if (editorRef.current && contract?.rendered_html) {
        editorRef.current.innerHTML = extractContentOnly(contract.rendered_html);
      }
    }, 50);
  };

  const handleChangeStatus = async () => {
    if (!newStatus) return;
    setSubmitting(true);
    try {
      await dispatch(changeContractStatus({ id, status: newStatus })).unwrap();
    } catch (err) {
      Notification("Error", err || t("Failed to change status"), "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableStatuses = () => {
    if (!contract) return [];
    const current = contract.status;
    const statuses = [];
    if (current === 'signed') statuses.push({ value: 'issued', label: t('Revert to Issued (Allow Re-sign)') });
    if (current !== 'terminated') statuses.push({ value: 'terminated', label: t('Terminated') });
    if (current !== 'expired') statuses.push({ value: 'expired', label: t('Expired') });
    if (current === 'pending_signature') statuses.push({ value: 'issued', label: t('Issued') });
    return statuses;
  };

  const handleSaveEdit = async () => {
    if (!editorRef.current) return;
    setSubmitting(true);
    try {
      const editedContent = editorRef.current.innerHTML;
      const fullHtml = rebuildFullHtml(contract.rendered_html, editedContent);
      await dispatch(updateContractHtml({ id, rendered_html: fullHtml })).unwrap();
    } catch (err) {
      Notification("Error", err || t("Failed to save"), "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  if (!contract) {
    return <div className="text-center p-3">{t("Loading...")}</div>;
  }

  const canEdit = !isEmployee;
  const processedHtml = injectLogo(contract.rendered_html, companyLogoUrl);

  return (
    <Fragment>
      <div className="main-content contracts">
        {/* ── Page Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {t("Contract Details")}
            {contract.is_customised && (
              <Badge color="light-warning" className="ms-1" style={{ fontSize: "0.65rem", verticalAlign: "middle" }}>
                {t("Customised")}
              </Badge>
            )}
          </h3>
          <div className="d-flex gap-1">
            {canEdit && !editing && getAvailableStatuses().length > 0 && (
              <Button color="outline-secondary" size="sm" onClick={() => { setNewStatus(""); setStatusModal(true); }}>
                <RefreshCw size={14} className="me-50" />{t("Change Status")}
              </Button>
            )}
            {canEdit && !editing && contract.rendered_html && (
              <Button color="outline-warning" size="sm" onClick={handleStartEdit}>
                <Edit2 size={14} className="me-50" />{t("Edit Contract")}
              </Button>
            )}
            {contract.rendered_html && !editing && (
              <Button color="outline-primary" size="sm" onClick={handleDownloadPdf}>
                <Download size={14} className="me-50" />{t("Download PDF")}
              </Button>
            )}
            <Button type="button" className="btn-primary" onClick={() => navigate(-1)}>
              <ArrowLeft size={17} />
            </Button>
          </div>
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
                <span className="fw-semibold">{contract.issued_at ? new Date(contract.issued_at).toLocaleDateString("en-GB") : "—"}</span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("Signed At")}</small>
                <span className={`fw-semibold ${contract.signed_at ? "text-success" : "text-muted"}`}>
                  {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString("en-GB") : "—"}
                </span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("Effective Date")}</small>
                <span className="fw-semibold">{contract.effective_date ? new Date(contract.effective_date).toLocaleDateString("en-GB") : "—"}</span>
              </Col>
              <Col md={3} sm={6} className="mb-2">
                <small className="text-muted d-block">{t("End Date")}</small>
                <span className="fw-semibold">{contract.end_date ? new Date(contract.end_date).toLocaleDateString("en-GB") : t("Permanent")}</span>
              </Col>
            </Row>
            {contract.last_edited_at && (
              <div className="small text-muted mt-50">
                {t("Last edited")}: {new Date(contract.last_edited_at).toLocaleDateString("en-GB")}{" "}
                {new Date(contract.last_edited_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            {contract.notes && (
              <div className="alert alert-light mb-0 mt-1 py-1">
                <strong>{t("Notes:")}</strong> {contract.notes}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Contract Document Card ── */}
        {contract.rendered_html ? (
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <div className="d-flex align-items-center justify-content-between w-100">
                <CardTitle tag="h5" className="mb-0">
                  {editing ? t("Edit Contract") : t("Contract Document")}
                </CardTitle>
                {editing && (
                  <div className="d-flex gap-1">
                    <Button color="success" size="sm" onClick={handleSaveEdit} disabled={submitting}>
                      <Save size={14} className="me-50" />{t("Save Changes")}
                    </Button>
                    <Button color="secondary" size="sm" outline onClick={handleCancelEdit}>
                      <X size={14} className="me-50" />{t("Cancel")}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody className="pt-2">
              {editing ? (
                <>
                  {/* ── Formatting Toolbar ── */}
                  <EditorToolbar />
                  {/* ── Editable Content (uncontrolled) ── */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="contract-editor"
                    style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.875rem",
                      lineHeight: 1.7,
                      color: "#333",
                      minHeight: "500px",
                      border: "1px solid #ddd",
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      padding: "20px",
                      outline: "none",
                      background: "#fff",
                    }}
                  />
                </>
              ) : (
                <div
                  className="contract-rendered-body"
                  style={{ fontFamily: "Arial, sans-serif", fontSize: "0.875rem", lineHeight: 1.7, color: "#333" }}
                  dangerouslySetInnerHTML={{ __html: extractDocumentContent(processedHtml) }}
                />
              )}
            </CardBody>
          </Card>
        ) : (
          contract.field_values?.length > 0 && (
            <Card className="mb-2">
              <CardHeader className="border-bottom py-1">
                <CardTitle tag="h5" className="mb-0">{t("Contract Fields")}</CardTitle>
              </CardHeader>
              <CardBody className="pt-2">
                <Row>
                  {contract.field_values.map((fv) => (
                    <Col md={6} sm={12} key={fv._id || fv.contract_field_id} className="mb-2">
                      <small className="text-muted d-block">
                        {fv.label || fv.contract_field_id}
                        {fv.is_auto_populated && (
                          <Badge color="light-success" pill className="ms-1" style={{ fontSize: "0.6rem" }}>{t("auto")}</Badge>
                        )}
                      </small>
                      <span className="fw-semibold">{fv.value || "—"}</span>
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>
          )
        )}

        {/* ── Back Button ── */}
        <div className="main-form-btn">
          <div className="form-btn mt-2">
            <Button type="button" color="secondary" onClick={() => navigate(`${appsRoot}/contracts`)}>
              {t("Back")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Change Status Modal ── */}
      <Modal isOpen={statusModal} toggle={() => setStatusModal(false)} centered backdrop="static" keyboard={false}>
        <ModalHeader toggle={() => setStatusModal(false)} style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }}
          close={<button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setStatusModal(false)} />}>
          <span style={{ color: '#fff', fontSize: '1.15rem' }}>{t("Change Contract Status")}</span>
        </ModalHeader>
        <ModalBody>
          <div className="mb-1">
            <small className="text-muted">{t("Current Status")}:</small>{" "}
            <Badge color={statusColors[contract?.status] || "light-secondary"}>
              {t(contract?.status?.replace(/_/g, " ") || "—")}
            </Badge>
          </div>
          <FormGroup>
            <Label>{t("New Status")}</Label>
            <Input type="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">{t("-- Select new status --")}</option>
              {getAvailableStatuses().map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Input>
          </FormGroup>
          {newStatus === 'issued' && contract?.status === 'signed' && (
            <div className="alert alert-warning py-1 small">
              <strong>{t("Warning:")}</strong>{" "}
              {t("This will clear the existing signature and send the contract back to the employee for re-signing.")}
            </div>
          )}
          {(newStatus === 'terminated' || newStatus === 'expired') && (
            <div className="alert alert-danger py-1 small">
              <strong>{t("Warning:")}</strong>{" "}
              {t("This will end the contract. The employee will no longer be able to sign it.")}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setStatusModal(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleChangeStatus} disabled={!newStatus || submitting}>
            {submitting ? <Spinner size="sm" /> : t("Update Status")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

// ─── Formatting Toolbar ────────────────────────────────────────────

const EditorToolbar = () => {
  const exec = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
  };

  const btnStyle = {
    border: "1px solid #ddd",
    background: "#f9f9f9",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "32px",
  };

  const sepStyle = {
    width: "1px",
    height: "24px",
    background: "#ddd",
    margin: "0 4px",
    display: "inline-block",
    verticalAlign: "middle",
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        alignItems: "center",
        padding: "8px 12px",
        border: "1px solid #ddd",
        borderRadius: "6px 6px 0 0",
        background: "#f8f8f8",
      }}
    >
      <button type="button" style={btnStyle} onClick={() => exec("bold")} title="Bold">
        <Bold size={14} />
      </button>
      <button type="button" style={btnStyle} onClick={() => exec("italic")} title="Italic">
        <Italic size={14} />
      </button>
      <button type="button" style={btnStyle} onClick={() => exec("underline")} title="Underline">
        <Underline size={14} />
      </button>
      <span style={sepStyle} />
      <button type="button" style={btnStyle} onClick={() => exec("justifyLeft")} title="Align Left">
        <AlignLeft size={14} />
      </button>
      <button type="button" style={btnStyle} onClick={() => exec("justifyCenter")} title="Align Center">
        <AlignCenter size={14} />
      </button>
      <button type="button" style={btnStyle} onClick={() => exec("justifyRight")} title="Align Right">
        <AlignRight size={14} />
      </button>
      <span style={sepStyle} />
      <button type="button" style={btnStyle} onClick={() => exec("insertUnorderedList")} title="Bullet List">
        <List size={14} />
      </button>
      <button type="button" style={btnStyle} onClick={() => exec("insertOrderedList")} title="Numbered List">
        <span style={{ fontSize: "12px", fontWeight: 600 }}>1.</span>
      </button>
      <span style={sepStyle} />
      <select
        style={{ ...btnStyle, minWidth: "80px", fontSize: "12px", padding: "4px" }}
        onChange={(e) => { if (e.target.value) exec("fontSize", e.target.value); }}
        defaultValue=""
        title="Font Size"
      >
        <option value="" disabled>Size</option>
        <option value="1">Small</option>
        <option value="3">Normal</option>
        <option value="4">Medium</option>
        <option value="5">Large</option>
        <option value="6">X-Large</option>
      </select>
      <select
        style={{ ...btnStyle, minWidth: "100px", fontSize: "12px", padding: "4px" }}
        onChange={(e) => { if (e.target.value) exec("formatBlock", e.target.value); }}
        defaultValue=""
        title="Heading"
      >
        <option value="" disabled>Heading</option>
        <option value="p">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
      </select>
      <span style={sepStyle} />
      <button
        type="button"
        style={{ ...btnStyle, fontSize: "12px", fontWeight: 600, color: "#d00" }}
        onClick={() => exec("removeFormat")}
        title="Clear Formatting"
      >
        <X size={12} /> Fmt
      </button>
    </div>
  );
};

// ─── Helper Functions ──────────────────────────────────────────────

function injectLogo(html, companyLogoUrl) {
  if (!html) return "";
  let result = html.replace(/src="http:\/\/[^/]+\/assets\//g, `src="${hostRestApiUrl}/assets/`);
  if (result.includes('class="page-header-left"') && /page-header-left">\s*<img/i.test(result)) return result;
  if (companyLogoUrl) {
    result = result.replace(
      /<div class="page-header-left">\s*<\/div>/,
      `<div class="page-header-left"><img src="${companyLogoUrl}" alt="Company Logo" style="max-height: 60px;" /></div>`
    );
  }
  return result;
}

function extractContentOnly(html) {
  if (!html) return "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const contentStart = body.indexOf('<div class="content">');
  const footerStart = body.indexOf('<div class="page-footer">');
  if (contentStart === -1) return body;
  const afterTag = contentStart + '<div class="content">'.length;
  if (footerStart !== -1) {
    const before = body.lastIndexOf("</div>", footerStart);
    return body.substring(afterTag, before > afterTag ? before : footerStart).trim();
  }
  const last = body.lastIndexOf("</div>");
  return body.substring(afterTag, last > afterTag ? last : undefined).trim();
}

function rebuildFullHtml(originalHtml, newContent) {
  if (!originalHtml) return newContent;
  const tag = '<div class="content">';
  const start = originalHtml.indexOf(tag);
  if (start === -1) return originalHtml;
  const after = start + tag.length;
  const footerTag = '<div class="page-footer">';
  const footerPos = originalHtml.indexOf(footerTag);
  let before = originalHtml.substring(0, after);
  let rest = "";
  if (footerPos !== -1) {
    const closing = originalHtml.lastIndexOf("</div>", footerPos);
    rest = originalHtml.substring(closing > after ? closing : footerPos);
  } else {
    const bodyEnd = originalHtml.indexOf("</body>");
    if (bodyEnd !== -1) {
      const closing = originalHtml.lastIndexOf("</div>", bodyEnd);
      rest = originalHtml.substring(closing > after ? closing : bodyEnd);
    } else {
      rest = "</div></body></html>";
    }
  }
  return `${before}\n    ${newContent}\n  ${rest}`;
}

function extractDocumentContent(html) {
  if (!html) return "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const headerStart = body.indexOf('<div class="page-header">');
  const contentStart = body.indexOf('<div class="content">');
  const footerStart = body.indexOf('<div class="page-footer">');
  if (contentStart === -1) return body;

  let headerInner = "";
  if (headerStart !== -1 && contentStart > headerStart) {
    const a = headerStart + '<div class="page-header">'.length;
    const b = body.lastIndexOf("</div>", contentStart);
    if (b > a) headerInner = body.substring(a, b).trim();
  }

  const afterContent = contentStart + '<div class="content">'.length;
  let contentInner = "";
  if (footerStart !== -1) {
    const b = body.lastIndexOf("</div>", footerStart);
    contentInner = body.substring(afterContent, b > afterContent ? b : footerStart).trim();
  } else {
    const last = body.lastIndexOf("</div>");
    contentInner = body.substring(afterContent, last > afterContent ? last : undefined).trim();
  }

  let footerInner = "";
  if (footerStart !== -1) {
    const a = footerStart + '<div class="page-footer">'.length;
    const b = body.lastIndexOf("</div>");
    if (b > a) footerInner = body.substring(a, b).trim();
  }

  const h = headerInner ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0 12px;border-bottom:2px solid #333;margin-bottom:24px;">${headerInner}</div>` : "";
  const f = footerInner ? `<div style="text-align:center;border-top:1px solid #ccc;padding:10px 0 0;margin-top:30px;font-size:11px;color:#777;">${footerInner}</div>` : "";
  return `${h}<div>${contentInner}</div>${f}`;
}

export default ContractView;

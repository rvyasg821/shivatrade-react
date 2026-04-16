// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getContractTemplate,
  createContractTemplate,
  updateContractTemplate,
  createContractSection,
  updateContractSection,
  deleteContractSection,
  reorderContractSections,
  cloneContractTemplate,
  clearContractMessages,
  clearContractItem,
} from "../../store";

// ** Reactstrap Imports
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle, Form, FormFeedback,
  Label, Input, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter,
} from "reactstrap";

// ** React Hook Form
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** WYSIWYG Editor
import { Editor } from "react-draft-wysiwyg";
import { EditorState, Modifier, ContentState, convertToRaw } from "draft-js";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

// ** Toast
import Notification from "@components/toast/notification";

// ** i18n
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft, Plus, Trash2, Edit2, Save, Copy, FileText, ChevronUp, ChevronDown } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

// ─────────────────────────────────────────────
// Available placeholder variables
// ─────────────────────────────────────────────
const VARIABLES = [
  // ── Contract ──
  { token: "contractId", label: "Contract ID", group: "Contract" },
  { token: "effectiveDate", label: "Effective Date", group: "Contract" },
  { token: "endDate", label: "End Date", group: "Contract" },
  { token: "todayDate", label: "Today's Date", group: "Contract" },
  { token: "issuedDate", label: "Issued Date", group: "Contract" },
  // ── Employee — Basic ──
  { token: "employeeName", label: "Employee Full Name", group: "Employee" },
  { token: "firstName", label: "First Name", group: "Employee" },
  { token: "middleName", label: "Middle Name", group: "Employee" },
  { token: "lastName", label: "Last Name", group: "Employee" },
  { token: "email", label: "Email", group: "Employee" },
  { token: "phone", label: "Mobile", group: "Employee" },
  { token: "homeTelephone", label: "Home Telephone", group: "Employee" },
  { token: "employeeCode", label: "Employee Code", group: "Employee" },
  { token: "designation", label: "Designation / Job Title", group: "Employee" },
  { token: "department", label: "Department", group: "Employee" },
  { token: "startDate", label: "Start / Joining Date", group: "Employee" },
  { token: "dateOfBirth", label: "Date of Birth", group: "Employee" },
  // ── Employee — Personal ──
  { token: "niNumber", label: "NI Number", group: "Personal" },
  { token: "nationality", label: "Nationality", group: "Personal" },
  { token: "maritalStatus", label: "Marital Status", group: "Personal" },
  { token: "employeeAddress", label: "Employee Address", group: "Personal" },
  // ── Salary & Working ──
  { token: "salary", label: "Annual Salary", group: "Salary" },
  { token: "hourlyRate", label: "Hourly Rate", group: "Salary" },
  { token: "weeklyHours", label: "Weekly Hours", group: "Salary" },
  { token: "payrollFrequency", label: "Payroll Frequency", group: "Salary" },
  { token: "workingPattern", label: "Working Pattern", group: "Salary" },
  // ── Bank & Pension ──
  { token: "bankName", label: "Bank Name", group: "Bank" },
  { token: "sortCode", label: "Sort Code", group: "Bank" },
  { token: "accountNumber", label: "Account Number", group: "Bank" },
  { token: "pensionProvider", label: "Pension Provider", group: "Bank" },
  // ── Emergency Contact ──
  { token: "kinName", label: "Next of Kin Name", group: "Emergency" },
  { token: "kinRelationship", label: "Next of Kin Relationship", group: "Emergency" },
  { token: "kinPhone", label: "Next of Kin Phone", group: "Emergency" },
  // ── Location ──
  { token: "branchName", label: "Branch / Location Name", group: "Location" },
  // ── Company ──
  { token: "companyName", label: "Company Name", group: "Company" },
  { token: "companyCode", label: "Company Code", group: "Company" },
  { token: "companyRegistration", label: "Company Registration No.", group: "Company" },
  { token: "companyVat", label: "Company VAT / Tax No.", group: "Company" },
  { token: "companyAddress", label: "Company Address", group: "Company" },
  { token: "payeReference", label: "PAYE Reference", group: "Company" },
  { token: "companyPension", label: "Company Pension Provider", group: "Company" },
  // ── Signature ──
  { token: "employeeSignature", label: "Employee Signature", group: "Signature" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const htmlToEditorState = (html) => {
  if (!html) return EditorState.createEmpty();
  const { contentBlocks, entityMap } = htmlToDraft(html);
  const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
  return EditorState.createWithContent(contentState);
};

const editorStateToHtml = (editorState) =>
  draftToHtml(convertToRaw(editorState.getCurrentContent()));

// ─────────────────────────────────────────────
// Section Form Schema
// ─────────────────────────────────────────────
const sectionSchema = yup.object().shape({
  title: yup.string().required("Section title is required").max(200),
});

// ─────────────────────────────────────────────
// Template Form Schema
// ─────────────────────────────────────────────
const templateSchema = yup.object().shape({
  name: yup.string().required("Template name is required").max(200),
});

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const ContractTemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isEdit = !!id;

  const store = useSelector((state) => state.contract);
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["contract"] || {};
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add);

  // ── Template form ──
  const {
    control: tControl,
    handleSubmit: tHandleSubmit,
    reset: tReset,
    formState: { errors: tErrors },
  } = useForm({
    resolver: yupResolver(templateSchema),
    defaultValues: { name: "", description: "", status: "draft", requires_signature: true },
  });

  // ── Sections state ──
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);

  // ── Active section edit state ──
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [sectionDirty, setSectionDirty] = useState(false);

  // ── Add/Edit Section modal ──
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);

  const {
    control: sControl,
    handleSubmit: sHandleSubmit,
    reset: sReset,
    formState: { errors: sErrors },
  } = useForm({ resolver: yupResolver(sectionSchema) });

  // ─────────────────────────────────────────────
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (isEdit) dispatch(getContractTemplate(id));
    return () => dispatch(clearContractItem());
  }, [id]);

  // Load template data into form
  useEffect(() => {
    if (store?.templateItem) {
      const tmpl = store.templateItem;
      tReset({
        name: tmpl.name || "",
        description: tmpl.description || "",
        status: tmpl.status || "draft",
        requires_signature: tmpl.requires_signature !== false,
      });
      setSections(tmpl.sections || []);
      if (tmpl.sections?.length > 0 && !activeSection) {
        const first = tmpl.sections[0];
        activateSection(first);
      }
    }
  }, [store?.templateItem?._id]);

  // Notifications + action flags
  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(clearContractMessages());

    if (store?.actionFlag === "CT_CRT_SCS" && store?.templateItem?._id) {
      navigate(`${appsRoot}/contracts/templates/edit/${store.templateItem._id}`, { replace: true });
    }
    if (store?.actionFlag === "CS_CRT_SCS" && store?.sectionItem) {
      // Optimistically add new section to sidebar immediately
      setSections((prev) => [...prev, store.sectionItem]);
      activateSection(store.sectionItem);
      setSectionModalOpen(false);
      setSectionDirty(false);
      // Also reload from server for consistency
      if (id || store?.templateItem?._id) {
        dispatch(getContractTemplate(id || store.templateItem._id));
      }
    }
    if (store?.actionFlag === "CS_UPD_SCS" || store?.actionFlag === "CS_DEL_SCS") {
      if (id || store?.templateItem?._id) {
        dispatch(getContractTemplate(id || store.templateItem._id));
      }
      setSectionModalOpen(false);
      setSectionDirty(false);
    }
    if (store?.actionFlag === "CT_GET_SCS" && store?.templateItem) {
      // Sync sidebar sections whenever the template is reloaded from the server
      setSections(store.templateItem.sections || []);
    }
    if (store?.actionFlag === "CT_CLN_SCS" && store?.templateItem?._id) {
      navigate(`${appsRoot}/contracts/templates/edit/${store.templateItem._id}`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  // ─────────────────────────────────────────────
  // Activate a section (load into editor)
  // ─────────────────────────────────────────────
  const activateSection = (section) => {
    setActiveSection(section._id);
    setSectionTitle(section.title || "");
    setSectionDescription(section.description || "");
    setEditorState(htmlToEditorState(section.rich_text_body || ""));
    setSectionDirty(false);
  };

  // When sections list updates, sync the active section editor
  useEffect(() => {
    if (activeSection && sections.length > 0) {
      const sec = sections.find((s) => s._id === activeSection);
      if (sec && !sectionDirty) {
        setSectionTitle(sec.title || "");
        setSectionDescription(sec.description || "");
        setEditorState(htmlToEditorState(sec.rich_text_body || ""));
      }
    }
  }, [sections]);

  // ─────────────────────────────────────────────
  // Insert {{variable}} at cursor
  // ─────────────────────────────────────────────
  const insertVariable = (token) => {
    const text = `{{${token}}}`;
    const contentState = Modifier.insertText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      text,
    );
    setEditorState(EditorState.push(editorState, contentState, "insert-characters"));
    setSectionDirty(true);
  };

  // ─────────────────────────────────────────────
  // Save section body (title + description + rich_text_body)
  // ─────────────────────────────────────────────
  const handleSaveSectionBody = () => {
    if (!activeSection) return;
    const html = editorStateToHtml(editorState);
    dispatch(updateContractSection({
      id: activeSection,
      data: {
        title: sectionTitle,
        description: sectionDescription,
        rich_text_body: html,
      },
    }));
    setSectionDirty(false);
    // Update local state immediately for responsiveness
    setSections((prev) =>
      prev.map((s) =>
        s._id === activeSection
          ? { ...s, title: sectionTitle, description: sectionDescription, rich_text_body: html }
          : s,
      ),
    );
  };

  // ─────────────────────────────────────────────
  // Add / Edit Section modal
  // ─────────────────────────────────────────────
  const openAddSection = () => {
    setEditingSectionId(null);
    sReset({ title: "", description: "" });
    setSectionModalOpen(true);
  };

  const handleSectionModalSubmit = sHandleSubmit((data) => {
    if (!isEdit && !store?.templateItem?._id) {
      Notification("Warning", t("Save the template first before adding sections."), "warning");
      setSectionModalOpen(false);
      return;
    }
    const templateId = id || store?.templateItem?._id;
    dispatch(createContractSection({
      contract_template_id: templateId,
      title: data.title,
      description: data.description || "",
    }));
  });

  // ─────────────────────────────────────────────
  // Move section up/down
  // ─────────────────────────────────────────────
  const handleMoveSection = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Update local state immediately for responsive UI
    setSections(reordered);

    // Persist new order to backend
    const orderedIds = reordered.map(s => s._id);
    dispatch(reorderContractSections({ templateId: id, orderedIds }));
  };

  // ─────────────────────────────────────────────
  // Delete section
  // ─────────────────────────────────────────────
  const handleDeleteSection = (sectionId) => {
    dispatch(deleteContractSection(sectionId));
    if (activeSection === sectionId) {
      setActiveSection(null);
      setSectionTitle("");
      setSectionDescription("");
      setEditorState(EditorState.createEmpty());
    }
  };

  // ─────────────────────────────────────────────
  // Save template metadata
  // ─────────────────────────────────────────────
  const onTemplateSubmit = tHandleSubmit((data) => {
    if (isEdit) {
      dispatch(updateContractTemplate({ id, data }));
    } else {
      dispatch(createContractTemplate(data));
    }
  });

  // ─────────────────────────────────────────────
  const isSystem = store?.templateItem?.is_system;
  const isSubmitting = !store?.loading;

  return (
    <Fragment>
      <div className="main-content contracts">
        {/* ── Page Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-1">
            <h3 className="mb-0">
              {isEdit ? t("Edit Contract Template") : t("New Contract Template")}
            </h3>
            {isSystem && (
              <Badge color="light-info" pill className="ms-1">
                {t("System Template")}
              </Badge>
            )}
          </div>
          <div className="d-flex gap-1">
            {isSystem && isEdit && (
              <Button
                color="outline-primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => dispatch(cloneContractTemplate(id))}
              >
                <Copy size={14} className="me-1" />
                {t("Clone to Customise")}
              </Button>
            )}
            <Button type="button" className="btn-primary" onClick={() => navigate(-1)}>
              <ArrowLeft size={17} />
            </Button>
          </div>
        </div>

        {/* ── Template Metadata Card ── */}
        <Card className="mb-2">
          <CardHeader className="border-bottom py-1">
            <CardTitle tag="h5" className="mb-0">{t("Template Details")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <Form onSubmit={onTemplateSubmit}>
              <Row>
                <Col md={4} sm={12} className="mb-2">
                  <Label className="form-label">
                    {t("Template Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={tControl}
                    render={({ field }) => (
                      <Input {...field} placeholder={t("e.g. Standard Employment Contract")}
                        invalid={!!tErrors.name} readOnly={isSystem} />
                    )}
                  />
                  {tErrors.name && <FormFeedback>{tErrors.name.message}</FormFeedback>}
                </Col>

                <Col md={4} sm={12} className="mb-2">
                  <Label className="form-label">{t("Status")}</Label>
                  <Controller
                    name="status"
                    control={tControl}
                    render={({ field }) => (
                      <Input type="select" {...field} disabled={isSystem}>
                        <option value="draft">{t("Draft")}</option>
                        <option value="active">{t("Active")}</option>
                        <option value="archived">{t("Archived")}</option>
                      </Input>
                    )}
                  />
                </Col>

                <Col md={4} sm={12} className="mb-2 d-flex align-items-end">
                  <div className="form-check form-switch mt-1">
                    <Controller
                      name="requires_signature"
                      control={tControl}
                      render={({ field }) => (
                        <Input
                          type="checkbox"
                          className="form-check-input"
                          id="requires_signature"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isSystem}
                        />
                      )}
                    />
                    <Label className="form-check-label ms-75" htmlFor="requires_signature">
                      {t("Requires Employee Signature")}
                    </Label>
                  </div>
                </Col>

                <Col sm={12} className="mb-2">
                  <Label className="form-label">{t("Description")}</Label>
                  <Controller
                    name="description"
                    control={tControl}
                    render={({ field }) => (
                      <Input type="textarea" rows={2} {...field}
                        placeholder={t("Optional description or internal notes")}
                        readOnly={isSystem} />
                    )}
                  />
                </Col>
              </Row>

              {!isSystem && (
                <div className="main-form-btn">
                  <div className="form-btn mt-1">
                    <Button type="submit" color="primary" disabled={isSubmitting}>
                      <Save size={14} className="me-1" />
                      {isSubmitting
                        ? t("Saving...")
                        : isEdit
                        ? t("Save Template")
                        : t("Create Template")}
                    </Button>
                  </div>
                  {isEdit && (
                    <div className="form-btn mt-1">
                      <Button
                        type="button"
                        color="secondary"
                        onClick={() => navigate(`${appsRoot}/contracts/templates`)}
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Form>
          </CardBody>
        </Card>

        {/* ── Sections Builder (only visible after template is created) ── */}
        {isEdit && (
          <Row>
            {/* LEFT: Section List */}
            <Col md={3} sm={12}>
              <Card className="h-100">
                <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between">
                  <CardTitle tag="h6" className="mb-0">{t("Sections")}</CardTitle>
                  {canWrite && !isSystem && (
                    <Button color="primary" size="sm" onClick={openAddSection}>
                      <Plus size={13} className="me-25" />
                      {t("Add")}
                    </Button>
                  )}
                </CardHeader>
                <CardBody className="p-0">
                  {sections.length === 0 ? (
                    <div className="text-center text-muted py-3 px-2 small">
                      <FileText size={28} className="mb-1 opacity-50" />
                      <p className="mb-0">{t("No sections yet.")}</p>
                      {canWrite && !isSystem && (
                        <p className="mb-0">{t("Click \"Add\" to create the first section.")}</p>
                      )}
                    </div>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {sections.map((section, index) => {
                        const isActive = activeSection === section._id;
                        return (
                          <li
                            key={section._id}
                            onClick={() => activateSection(section)}
                            style={{ cursor: "pointer" }}
                            className={`d-flex align-items-center justify-content-between px-2 py-1${
                              index < sections.length - 1 ? " border-bottom" : ""
                            }${isActive ? " section-item-active" : ""}`}
                          >
                            <div className="d-flex align-items-center gap-1 overflow-hidden">
                              <span
                                style={{
                                  width: 3, minWidth: 3, height: 32, borderRadius: 2,
                                  background: isActive ? "#7367f0" : "#ebe9f1",
                                  flexShrink: 0,
                                }}
                              />
                              <div className="overflow-hidden ms-75">
                                <div
                                  className={`text-truncate${isActive ? " fw-bold text-primary" : " fw-semibold text-body"}`}
                                  style={{ fontSize: "0.875rem" }}
                                >
                                  {section.title}
                                </div>
                                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                                  {section.rich_text_body
                                    ? t("Has content")
                                    : t("Empty")}
                                </small>
                              </div>
                            </div>
                            {canWrite && !isSystem && (
                              <div className="d-flex align-items-center gap-25 flex-shrink-0 ms-1">
                                <span className="cursor-pointer" style={{ opacity: index === 0 ? 0.3 : 1 }}
                                  onClick={(e) => { e.stopPropagation(); handleMoveSection(index, -1); }}>
                                  <ChevronUp size={14} className="text-secondary" />
                                </span>
                                <span className="cursor-pointer" style={{ opacity: index === sections.length - 1 ? 0.3 : 1 }}
                                  onClick={(e) => { e.stopPropagation(); handleMoveSection(index, 1); }}>
                                  <ChevronDown size={14} className="text-secondary" />
                                </span>
                                <span className="cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSection(section._id); }}>
                                  <Trash2 size={13} className="text-danger" />
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </Col>

            {/* RIGHT: Section Content Editor */}
            <Col md={9} sm={12}>
              {!activeSection ? (
                <Card className="h-100">
                  <CardBody className="d-flex align-items-center justify-content-center text-muted">
                    <div className="text-center">
                      <FileText size={40} className="mb-2 opacity-25" />
                      <p className="mb-0">{t("Select a section from the left to edit its content.")}</p>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between">
                    <CardTitle tag="h5" className="mb-0">
                      {sectionTitle || t("Section Content")}
                    </CardTitle>
                    {sectionDirty && (
                      <Badge color="light-warning" pill style={{ fontSize: "0.7rem" }}>
                        {t("Unsaved")}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardBody className="pt-2">
                    {/* Section title / description fields */}
                    <Row className="mb-2">
                      <Col md={6} sm={12} className="mb-1">
                        <Label className="form-label">
                          {t("Section Title")} <span className="text-danger">*</span>
                        </Label>
                        <Input
                          value={sectionTitle}
                          onChange={(e) => { setSectionTitle(e.target.value); setSectionDirty(true); }}
                          placeholder={t("e.g. 1. COMMENCEMENT OF EMPLOYMENT")}
                          readOnly={!canWrite || isSystem}
                        />
                      </Col>
                      <Col md={6} sm={12} className="mb-1">
                        <Label className="form-label">{t("Section Description")}</Label>
                        <Input
                          value={sectionDescription}
                          onChange={(e) => { setSectionDescription(e.target.value); setSectionDirty(true); }}
                          placeholder={t("Internal note (not shown in contract)")}
                          readOnly={!canWrite || isSystem}
                        />
                      </Col>
                    </Row>

                    {/* Variable picker */}
                    {canWrite && !isSystem && (
                      <div className="mb-2">
                        <Label className="form-label d-block mb-75">
                          {t("Insert Variable")}
                          <small className="text-muted ms-1">
                            {t("(click to insert at cursor position)")}
                          </small>
                        </Label>
                        <div>
                          {(() => {
                            const groups = {};
                            VARIABLES.forEach((v) => {
                              const g = v.group || 'Other';
                              if (!groups[g]) groups[g] = [];
                              groups[g].push(v);
                            });
                            return Object.entries(groups).map(([group, vars]) => (
                              <div key={group} className="mb-1">
                                <small className="text-muted fw-semibold d-block mb-25">{t(group)}</small>
                                <div className="d-flex flex-wrap gap-50">
                                  {vars.map(({ token, label }) => (
                                    <span
                                      key={token}
                                      className="contract-variable-badge"
                                      onClick={() => insertVariable(token)}
                                      title={`${label} — {{${token}}}`}
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* WYSIWYG Editor */}
                    <div className="mb-2">
                      <Label className="form-label">{t("Section Content")}</Label>
                      <div
                        style={{
                          border: "1px solid #ebe9f1",
                          borderRadius: "0.357rem",
                          minHeight: 300,
                        }}
                      >
                        <Editor
                          editorState={editorState}
                          onEditorStateChange={(state) => {
                            setEditorState(state);
                            setSectionDirty(true);
                          }}
                          readOnly={!canWrite || isSystem}
                          toolbar={{
                            options: ["inline", "blockType", "list", "textAlign", "history"],
                            inline: { options: ["bold", "italic", "underline"] },
                            blockType: {
                              inDropdown: true,
                              options: ["Normal", "H1", "H2", "H3", "Blockquote"],
                            },
                            list: { options: ["unordered", "ordered"] },
                          }}
                          editorStyle={{
                            minHeight: 250,
                            padding: "0 12px",
                            fontFamily: "Arial, sans-serif",
                            fontSize: 13,
                          }}
                          toolbarStyle={{
                            borderBottom: "1px solid #ebe9f1",
                            borderRadius: "0.357rem 0.357rem 0 0",
                            margin: 0,
                          }}
                          wrapperStyle={{ border: "none" }}
                          placeholder={t("Write the section content here. Use variables above to insert dynamic data...")}
                        />
                      </div>
                    </div>

                    {/* Save section button */}
                    {canWrite && !isSystem && (
                      <div className="main-form-btn">
                        <div className="form-btn mt-1">
                          <Button
                            color="primary"
                            onClick={handleSaveSectionBody}
                            disabled={isSubmitting || !sectionDirty}
                          >
                            <Save size={14} className="me-1" />
                            {isSubmitting ? t("Saving...") : t("Save Section")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>
          </Row>
        )}

        {/* If template not yet created */}
        {!isEdit && (
          <div className="alert alert-info mt-2">
            {t("Create the template above, then you will be able to add sections and content.")}
          </div>
        )}
      </div>

      {/* ── Add Section Modal ── */}
      <Modal isOpen={sectionModalOpen} toggle={() => setSectionModalOpen(false)} centered>
        <ModalHeader toggle={() => setSectionModalOpen(false)}>
          {t("Add Section")}
        </ModalHeader>
        <Form onSubmit={handleSectionModalSubmit}>
          <ModalBody>
            <div className="mb-2">
              <Label className="form-label">
                {t("Section Title")} <span className="text-danger">*</span>
              </Label>
              <Controller
                name="title"
                control={sControl}
                render={({ field }) => (
                  <Input {...field} placeholder={t("e.g. 1. COMMENCEMENT OF EMPLOYMENT")}
                    invalid={!!sErrors.title} />
                )}
              />
              {sErrors.title && <FormFeedback>{sErrors.title.message}</FormFeedback>}
            </div>
            <div>
              <Label className="form-label">{t("Description")}</Label>
              <Controller
                name="description"
                control={sControl}
                render={({ field }) => (
                  <Input type="textarea" rows={2} {...field}
                    placeholder={t("Internal note (optional)")} />
                )}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? t("Adding...") : t("Add Section")}
            </Button>
            <Button type="button" color="secondary" onClick={() => setSectionModalOpen(false)}>
              {t("Cancel")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Fragment>
  );
};

export default ContractTemplateBuilder;

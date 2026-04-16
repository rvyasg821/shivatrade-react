/* eslint-disable object-shorthand */
/* eslint-disable quote-props */
// ** React Imports
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { createAssessment, getAssessmentById, updateAssessment } from "../store/index";

// ** Reactstrap Imports
import {
  Card,
  CardBody,
  Col,
  Label,
  Row,
  Form,
  Button,
  FormFeedback,
  FormGroup,
  Input
} from "reactstrap";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Editor } from "react-draft-wysiwyg";
import draftToHtml from "draftjs-to-html";
import { convertToRaw, EditorState, ContentState, convertFromHTML } from "draft-js";
import { useTranslation } from "react-i18next";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { startLoading, stopLoading } from "../../loadingstore";
import CopyToClipboard from "react-copy-to-clipboard";
import { TbCheckbox, TbCopyright } from "react-icons/tb";
import { appsRoot } from "../../../constants/defaultValues";
import Notification from "../../../@core/components/toast/notification";

const initAssessmentItem = {
  _id: "",
  name: "",
  description: "",
  order: "",
  additional_description: "",
  status: 1,
  show_score_calculation: false,
};

const draftEditorToolbarConfig = {
  options: ["blockType", "inline", "list", "textAlign", "link", "image", "history", "remove"],
  blockType: { inDropdown: true, options: ["Normal", "H1", "H2", "H3", "H4", "H5", "H6"] },
  inline: { inDropdown: false, options: ["bold", "italic", "underline", "strikethrough"] },
  textAlign: { options: ["left", "center", "right"] },
  link: { options: ["link"], defaultTargetOption: "_blank", showOpenOptionOnHover: true, showRemoveOption: true },
  image: { uploadEnabled: false, urlEnabled: true, previewImage: true, alt: { present: true, mandatory: false } },
  history: { options: ["undo", "redo"] },
  remove: { icon: undefined, className: undefined, component: undefined, popupClassName: undefined },
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required."),
});

const getDomailUrl = () => {
  let url = window?.location?.origin || "";
  if (!url && window?.location) {
    const protocol = window.location?.protocol || "";
    const host = window.location?.host || "";
    if (protocol && host) {
      url = `${protocol}//${host}`;
    }
  }

  return url
}


const AssessmentForm = ({ id, mode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const baseUrl = getDomailUrl();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const authStore = useSelector((state) => state.auth);
  const assessmentStore = useSelector((state) => state.AssessmentForms);
  const tenantId = authStore?.authUserItem?.tenantId || null;

  const url = `${baseUrl}/assessment-form/${id}${tenantId ? `?tenantId=${tenantId}` : ''}`

  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [editorHtmlContent, setEditorHtmlContent] = useState("");
  const [editorStateContent, setEditorStateContent] = useState(EditorState.createEmpty());

  const formikRef = useRef(null);

  useEffect(() => {
    if (mode === "edit" && id) {
      dispatch(getAssessmentById(id));
    }
  }, [mode, id, dispatch]);

  useEffect(() => {
    const assessmentItem = assessmentStore?.assessmentItem;

    if (!assessmentItem?._id || mode !== "edit") return;

    const formValues = {
      _id: assessmentItem._id ?? "",
      name: assessmentItem.name ?? "",
      description: assessmentItem.description ?? "",
      order: assessmentItem.order ?? "",
      additional_description: assessmentItem.additional_description ?? "",
      status: assessmentItem.status ?? 1,
      show_score_calculation: !!assessmentItem.show_score_calculation,
    };

    if (formikRef.current) {
      formikRef.current.setValues(formValues);
    }

    if (assessmentItem.additional_description) {
      const blocksFromHTML = convertFromHTML(assessmentItem.additional_description);
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap
      );
      setEditorStateContent(EditorState.createWithContent(contentState));
    } else {
      setEditorStateContent(EditorState.createEmpty());
    }
  }, [assessmentStore?.assessmentItem, mode]);

  useLayoutEffect(() => {
    setEditorHtmlContent("");
    setEditorStateContent(EditorState.createEmpty());
  }, []);

  useEffect(() => {
    if (showSnackBar) {
      const timer = setTimeout(() => {
        setShowSnackBar(false);
        setSnackbarMessage("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSnackBar]);

  useEffect(() => {
    if (assessmentStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [assessmentStore?.loading, dispatch]);

  const handleEditorStateChange = (state) => {
    setEditorStateContent(state);
    const html = draftToHtml(convertToRaw(state.getCurrentContent()));
    setEditorHtmlContent(html);
  };

  const handleSubmit = (values, { setSubmitting }) => {
    const payload = {
      name: values.name || "",
      description: values.description || "",
      status: values.status ?? 1,
      show_score_calculation: !!values.show_score_calculation,
    };

    if (editorHtmlContent && editorHtmlContent !== "<p></p>\n") {
      payload.additional_description = editorHtmlContent;
    }

    if (mode === "edit") {
      dispatch(updateAssessment({ id, data: payload })).then((res) => {
        Notification("Success", res?.payload?.success, "success");
      })
    } else {
      dispatch(createAssessment(payload)).then((res) => {
        navigate(`${appsRoot}/assessment-forms/edit/${res?.payload?.assessmentItem?._id}`)
      })
    }

  };

  return (
    <div>
      <Row>
        <Col>
          <Card>
            <CardBody>
              <Formik
                innerRef={formikRef}
                initialValues={initAssessmentItem}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize={false}
              >
                {({
                  values,
                  handleSubmit,
                  setFieldValue,
                  isSubmitting,
                  errors,
                  touched,
                }) => (
                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md="12" className="mb-2">
                        <Label className="form-label" for="name">
                          {t("Name")}
                        </Label>
                        <Field name="name">
                          {({ field }) => (
                            <Input
                              {...field}
                              id="name"
                              placeholder={t("Enter name")}
                              invalid={!!(errors.name && touched.name)}
                            />
                          )}
                        </Field>
                        <ErrorMessage name="name" component={FormFeedback} />
                      </Col>

                      <Col md="6" className="">
                        <Label className="form-label">{t("Status")}</Label>
                        <FormGroup className="d-flex">
                          <FormGroup check inline>
                            <Input
                              type="radio"
                              name="status"
                              id="status-active"
                              value={1}
                              checked={values.status === 1}
                              onChange={() => setFieldValue("status", 1)}
                            />
                            <Label check for="status-active">
                              {t('Active')}
                            </Label>
                          </FormGroup>
                          <FormGroup check inline>
                            <Input
                              type="radio"
                              name="status"
                              id="status-inactive"
                              value={2}
                              checked={values.status === 2}
                              onChange={() => setFieldValue("status", 2)}
                            />
                            <Label check for="status-inactive">
                              {t('Inactive')}
                            </Label>
                          </FormGroup>
                        </FormGroup>
                      </Col>

                      <Col md="6" className="mb-2">
                        <Label className="form-label">{t("Show Calculation")}</Label>
                        <div className="form-switch-custom d-flex align-items-center">
                          <Input
                            type="checkbox"
                            id="show_score_calculation"
                            checked={values.show_score_calculation}
                            onChange={(e) =>
                              setFieldValue("show_score_calculation", e.target.checked)
                            }
                          />
                          <Label
                            check
                            for="show_score_calculation"
                            className="mb-0 ms-2 user-select-none"
                            style={{ cursor: "pointer" }}
                          >
                            {values.show_score_calculation ? t("Yes") : t("No")}
                          </Label>
                        </div>
                      </Col>

                      <Col md="12" className="mb-2">
                        <Label className="form-label" for="description">
                          {t("Description")}
                        </Label>
                        <Field name="description">
                          {({ field }) => (
                            <Input
                              {...field}
                              id="description"
                              type="textarea"
                              rows="3"
                              placeholder={t("Enter description")}
                              invalid={!!(errors.description && touched.description)}
                            />
                          )}
                        </Field>
                        <ErrorMessage name="description" component={FormFeedback} />
                      </Col>

                      <Col md="12" className="mb-2 editor-div">
                        <Label className="form-label">
                          {t("Additional Description")}
                        </Label>
                        <Editor
                          toolbar={draftEditorToolbarConfig}
                          editorState={editorStateContent}
                          onEditorStateChange={handleEditorStateChange}
                          placeholder={t("Enter additional description...")}
                          wrapperClassName="border rounded"
                          editorClassName="p-2 min-h-200"
                          toolbarClassName="border-bottom"
                        />
                      </Col>
                      {mode === 'edit' &&

                        <Col xl={12} lg={12} md={12} className="mb-2">
                          <p>
                            <a
                              target="_blank"
                              rel="noreferrer"
                              className="text-white"
                              href={url}
                            >
                              {url}
                            </a>
                            <CopyToClipboard
                              text={url}
                              onCopy={() => setCopiedUrl(true)}
                            >
                              {copiedUrl ? (
                                <TbCheckbox
                                  size={25}
                                  className="cursor-pointer"
                                />
                              ) : (
                                <TbCopyright
                                  size={25}
                                  className="cursor-pointer"
                                />
                              )}
                            </CopyToClipboard>
                          </p>
                        </Col>
                      }
                    </Row>

                    <div className="d-flex justify-content-start gap-2 mt-2">
                      <Button
                        type="submit"
                        color="primary"
                        disabled={assessmentStore?.loading}
                      >
                        {assessmentStore?.loading ? t("Submiting...") : t("Submit")}
                      </Button>
                      <Button
                        type="button"
                        color="secondary"
                        onClick={() => navigate("/apps/assessment-forms")}
                      >
                        {t('Back')}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssessmentForm;
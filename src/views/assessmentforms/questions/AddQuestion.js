/* eslint-disable quote-props */
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Col,
  Label,
  Row,
  Button,
  FormFeedback,
  FormGroup,
  Input,
  Form,
} from "reactstrap";
import { Formik, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import draftToHtml from "draftjs-to-html";
import { convertToRaw, EditorState, ContentState, convertFromHTML } from "draft-js";
import deleteIcon from "../../../assets/images/svg/delete.svg";
import { createQuestion, getQuestionById, getSectionDropdown, updateQuestion } from "./store";
import { startLoading, stopLoading } from "../../loadingstore";
import { appsRoot } from "../../../constants/defaultValues";

const initQuestion = {
  section_id: null,
  question: "",
  description: "",
  option_type: { label: "Note", value: "note" },
  options: [{ value: "", points: "" }],
  value: "",
  is_mandatory: false,
  point: 0,
  order: null,
  status: 1,
  deletedAt: null
};

const questionTypeOptions = [
  { label: "Note", value: "note" },
  { label: "Radio", value: "radio" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Text Box", value: "text" },
  { label: "Text Area", value: "textarea" },
  { label: "Date", value: "date" }
];


const AddQuestion = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const formikRef = useRef(null);
  const { questionId } = useParams();
  const isEdit = Boolean(questionId);

  const queryParams = new URLSearchParams(location.search);
  const assessmentId = queryParams.get("assessmentId");
  const sectionId = queryParams.get("sectionId");

  const parentQuestion = location?.state?.sectionId;
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [sectionList, setSectionList] = useState([]);
  const [questionEditorState, setQuestionEditorState] = useState(EditorState.createEmpty());
  const [descriptionEditorState, setDescriptionEditorState] = useState(EditorState.createEmpty());
  const [questionHtml, setQuestionHtml] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");

  const questionStore = useSelector((state) => state.questionAssessment);

  const validationSchema = Yup.object().shape({
  section_id: Yup.object().required(t("Section is required.")).nullable(),
  question: Yup.string().required(t("Question is required.")),
  option_type: Yup.object()
    .shape({ value: Yup.string().required(t("Option type is required.")) })
    .required(t("Option type is required."))
    .nullable(),
  options: Yup.array().when("option_type", {
    is: (opt) => ["checkbox", "radio"].includes(opt?.value),
    then: () =>
      Yup.array().of(
        Yup.object().shape({
          points: Yup.string().required(t("Points is required."))
        })
      )
  }),
  point: Yup.number().when("option_type", {
    is: (opt) => ["note", "textarea", "text"].includes(opt?.value),
    then: () => Yup.number().required(t("Points is required."))
  })
});


  useEffect(() => {
    if (questionStore.dropdownItem) {
      const options = questionStore.dropdownItem.map((item) => ({
        label: item.name,
        value: item._id
      }));
      setSectionList(options);
    }
  }, [questionStore.dropdownItem]);

  useEffect(() => {
    if (isEdit) {
      dispatch(getQuestionById(questionId));
    }
  }, [isEdit, questionId, dispatch]);

  useEffect(() => {
    if (questionStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [questionStore?.loading, dispatch]);

  useEffect(() => {
    console.log('USEEFFECT ASSESSMENT ID:', assessmentId);

    if (assessmentId) {
      dispatch(getSectionDropdown(assessmentId));
    }
  }, [assessmentId, dispatch]);

  useEffect(() => {
    if (showSnackBar) {
      const timer = setTimeout(() => {
        setShowSnackBar(false);
        setSnackbarMessage("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSnackBar]);

  useLayoutEffect(() => {
    setQuestionEditorState(EditorState.createEmpty());
    setDescriptionEditorState(EditorState.createEmpty());
    setQuestionHtml("");
    setDescriptionHtml("");
  }, []);

  const handleQuestionChange = (state) => {
    setQuestionEditorState(state);
    const html = draftToHtml(convertToRaw(state.getCurrentContent()));
    setQuestionHtml(html);
    if (formikRef.current) {
      formikRef.current.setFieldValue("question", html);
    }
  };

  const handleDescriptionChange = (state) => {
    setDescriptionEditorState(state);
    const html = draftToHtml(convertToRaw(state.getCurrentContent()));
    setDescriptionHtml(html);
    if (formikRef.current) {
      formikRef.current.setFieldValue("description", html);
    }
  };

  const handleChangeOptionType = (opt, setFieldValue) => {
    if (["note", "textarea", "text"].includes(opt?.value)) {
      setFieldValue("options", [{ value: "", points: "" }]);
    }
  };

  const handleSubmit = (values) => {

    const payload = {
      assessment_id: assessmentId || null,
      section_id: values.section_id?.value || null,
      question: values.question,
      description: values.description,
      option_type: values.option_type?.value,
      options: values.options,
      is_child: false,
      is_mandatory: values.is_mandatory,
      point: values.point || 0,
      order: values.order ?? 1,
      status: values.status,
    };

    if (isEdit) {
      dispatch(updateQuestion({ id: questionId, payload })).then(() => {
        navigate(`${appsRoot}/assessment-forms/edit/${assessmentId}`, {
          state: { openQuestionTab: true }
        });
      })
    } else {
      dispatch(createQuestion(payload)).then(() => {
        navigate(`${appsRoot}/assessment-forms/edit/${assessmentId}`, {
          state: { openQuestionTab: true }
        });
      });
    }
  };

  const goBack = () => {
    if (assessmentId) {
      navigate(`${appsRoot}/assessment-forms/edit/${assessmentId}`, {
        state: { openQuestionTab: true }
      });
    } else {
     
    }
  };

  const preselectedSectionFromParent = parentQuestion
    ? sectionList.find((section) => section.value === parentQuestion)
    : null;

  const getInitialValues = () => {
    if (preselectedSectionFromParent) {
      return {
        ...initQuestion,
        section_id: preselectedSectionFromParent,
      };
    }

    if (!isEdit || !questionStore.questionItem) {
      return initQuestion;
    }

    const q = questionStore.questionItem;

    const selectedOptionType = questionTypeOptions.find(
      (opt) => opt.value === q.option_type
    ) || initQuestion.option_type;

    const selectedSection = sectionList.find((s) => s.value === q.section_id) || null;

    return {
      section_id: selectedSection,
      question: q.question || "",
      description: q.description || "",
      option_type: selectedOptionType,
      options:
        q.option_type === "checkbox" || q.option_type === "radio"
          ? q.options.map((opt) => ({
            value: opt.value,
            points: opt.points?.toString() || ""
          }))
          : [{ value: "", points: "" }],
      is_mandatory: q.is_mandatory || false,
      point: q.point || 0,
      order: q.order || null,
      status: q.status || 1
    };
  };

  useEffect(() => {
    if (isEdit && questionStore.questionItem && formikRef.current) {
      const q = questionStore.questionItem;

      if (q.question && q.question !== questionHtml) {
        try {
          const content = ContentState.createFromBlockArray(
            convertFromHTML(q.question).contentBlocks,
            convertFromHTML(q.question).entityMap
          );
          setQuestionEditorState(EditorState.createWithContent(content));
          setQuestionHtml(q.question);
          formikRef.current.setFieldValue("question", q.question);
        } catch (e) {
          formikRef.current.setFieldValue("question", q.question);
        }
      }

      if (q.description && q.description !== descriptionHtml) {
        try {
          const content = ContentState.createFromBlockArray(
            convertFromHTML(q.description).contentBlocks,
            convertFromHTML(q.description).entityMap
          );
          setDescriptionEditorState(EditorState.createWithContent(content));
          setDescriptionHtml(q.description);
          formikRef.current.setFieldValue("description", q.description);
        } catch (e) {
          formikRef.current.setFieldValue("description", q.description);
        }
      }
    }
  }, [isEdit, questionStore.questionItem, questionHtml, descriptionHtml]);

  return (
    <div className="main-content">
      <Row>
        <Col>
          <Card>
            <CardBody>
              <Formik
                innerRef={formikRef}
                initialValues={getInitialValues()}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize={true} 
              >
                {({
                  values,
                  errors,
                  touched,
                  isSubmitting,
                  setFieldValue,
                  setFieldTouched,
                  handleSubmit
                }) => (
                  <Form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit(e);
                    }}
                  >
                   
                    <Row>
                      <Col md="12" className="mb-2">
                        <Label className="form-label">{t("Section")}</Label>

                        <Select
                          name="section_id"
                          options={sectionList}
                          value={preselectedSectionFromParent || values.section_id}     
                          classNamePrefix="select"
                          placeholder="Select Section..."
                          onBlur={() => setFieldTouched("section_id", true)}
                          onChange={(v) => setFieldValue("section_id", v)}
                          isDisabled={!!parentQuestion}
                        />
                        {errors.section_id && touched.section_id && (
                          <FormFeedback className="d-block">
                            {errors.section_id}
                          </FormFeedback>
                        )}
                      </Col>

                      <Col md="12" className="mb-2">
                        <Label className="form-label" for="question">
                          {t("Question")}
                        </Label>
                        <Field name="question">
                          {({ field }) => (
                            <Input
                              {...field}
                              id="question"
                              type="textarea"
                              rows="3"
                              placeholder="Enter Question"
                              invalid={!!(errors.question && touched.question)}
                            />
                          )}
                        </Field>
                        <ErrorMessage name="question" component={FormFeedback} />
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

                      <Col md="6" className="mb-2">
                        <Label className="form-label">{t("Option Type")}</Label>
                        <Select
                          name="option_type"
                          value={values?.option_type}
                          options={questionTypeOptions}
                          classNamePrefix="select"
                          placeholder={t("Select type...")}
                          onChange={(opt) => {
                            setFieldValue("option_type", opt);
                            handleChangeOptionType(opt, setFieldValue);
                          }}
                        />

                        {errors.option_type && touched.option_type && (
                          <FormFeedback className="d-block">{errors.option_type}</FormFeedback>
                        )}
                      </Col>

                      {["note", "textarea", "text"].includes(values?.option_type?.value) && (
                        <Col md="6" className="mb-2">
                          <Label className="form-label">{t("Point")}</Label>
                          <Field name="point">
                            {({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                placeholder={t("Enter points")}
                                invalid={!!(errors.point && touched.point)}
                              />
                            )}
                          </Field>
                          <ErrorMessage name="point" component={FormFeedback} />
                        </Col>
                      )}

                      {!["note", "textarea", "text", "date"].includes(values?.option_type?.value) && (
                        <Col md="12" className="mb-2">
                          <Label className="form-label">{t("Options")}</Label>
                          <FieldArray name="options">
                            {({ remove, push }) => (
                              <div>
                                {values.options.map((_, idx) => (
                                  <Row key={idx} className="align-items-baseline mb-2">
                                    <Col md="5">
                                      <Field name={`options.${idx}.value`}>
                                        {({ field }) => (
                                          <Input
                                            {...field}
                                            type="text"
                                            placeholder="Option value"
                                            invalid={!!(errors.options?.[idx]?.value && touched.options?.[idx]?.value)}
                                          />
                                        )}
                                      </Field>
                                    </Col>
                                    <Col md="5">
                                      <Field name={`options.${idx}.points`}>
                                        {({ field }) => (
                                          <Input
                                            {...field}
                                            type="number"
                                            placeholder={t("Points")}
                                            invalid={!!(errors.options?.[idx]?.points && touched.options?.[idx]?.points)}
                                          />
                                        )}
                                      </Field>
                                      {errors.options?.[idx]?.points && touched.options?.[idx]?.points && (
                                        <FormFeedback className="d-block">
                                          {errors.options?.[idx]?.points}
                                        </FormFeedback>
                                      )}
                                    </Col>
                                    {values.options.length > 1 && (
                                      <Col md="2">
                                        <Button
                                          color="link"
                                          size="sm"
                                          className="text-danger p-0"
                                          onClick={() => remove(idx)}
                                        >
                                          <img src={deleteIcon} alt="delete" height={19} />
                                        </Button>
                                      </Col>
                                    )}
                                  </Row>
                                ))}

                                <Button
                                  type="button"
                                  color="primary"
                                  onClick={() => push({ value: "", points: "" })}
                                >
                                  + {t('Add Option')}
                                </Button>
                              </div>
                            )}
                          </FieldArray>
                        </Col>
                      )}

                      <Col md="6" className="d-none mb-2">
                        <FormGroup>
                          <Label className="form-label">{t("Order Number")}</Label>
                          <Field name="order">
                            {({ field }) => (
                              <Input {...field} type="number" />
                            )}
                          </Field>
                        </FormGroup>
                      </Col>

                      {!["note", "textarea", "text"].includes(values?.option_type?.value) && (
                        <Col md="6" className="mb-2">
                          <Label className="form-label">{t("Is Mandatory?")}</Label>
                          <div className="form-switch-custom d-flex align-items-center">
                            <Input
                              type="checkbox"
                              id="is_mandatory"
                              className="form-check-input-switch"
                              checked={values?.is_mandatory}
                              onChange={(e) => setFieldValue("is_mandatory", e.target.checked)}
                            />
                            <Label
                              check
                              for="is_mandatory"
                              className="mb-0 ms-2 user-select-none"
                              style={{ cursor: "pointer" }}
                            >
                              {values?.is_mandatory ? "Yes" : "No"}
                            </Label>
                          </div>
                        </Col>
                      )}

                      <Col md="6" className="">
                        <Label className="form-label">{t("Status")}</Label>
                        <FormGroup className="d-flex gap-4">
                          <FormGroup check inline>
                            <Input
                              type="radio"
                              name="status"
                              id="status-active"
                              value={1}
                              checked={values?.status === 1}
                              onChange={() => setFieldValue("status", 1)}
                            />
                            <Label check for="status-active">{t('Active')}</Label>
                          </FormGroup>
                          <FormGroup check inline>
                            <Input
                              type="radio"
                              name="status"
                              id="status-inactive"
                              value={2}
                              checked={values?.status === 2}
                              onChange={() => setFieldValue("status", 2)}
                            />
                            <Label check for="status-inactive">{t('Inactive')}</Label>
                          </FormGroup>
                        </FormGroup>
                      </Col>
                    </Row>

                    <div className="d-flex justify-content-start gap-2 mt-3">
                      <Button
                        type="submit"
                        color="primary"
                        disabled={questionStore?.loading}
                      >
                        {questionStore?.loading ? t("Submitting...") : t("Submit")}
                      </Button>
                      <Button type="button" color="secondary" onClick={goBack}>
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

export default AddQuestion;
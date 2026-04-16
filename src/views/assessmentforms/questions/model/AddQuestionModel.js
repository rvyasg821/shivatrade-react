
import React, { useEffect, useLayoutEffect, useState } from "react";
import ReactSnackBar from "react-js-snackbar";
import { TiMessages, TiTrash } from "react-icons/ti";
import { useDispatch } from "react-redux";
// import { getSectionList } from "views/section/store";
import Select from "react-select";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
// import { questionTypeOptions } from "utility/reduxConstant";
// import { createQuestion, updateQuestion } from "../store";
import * as Yup from "yup";
import { Col, Modal, ModalBody, ModalHeader, Row, FormGroup, Label, } from "reactstrap";
import { useTranslation } from "react-i18next";
const questionTypeOptions = [
  { label: "Note", value: "note" },
  { label: "Radio", value: "radio" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Text Box", value: "text" },
  { label: "Text Area", value: "textarea" },
  { label: "Date", value: "date" }
]

const QuestionModel = ({
  show,
  closePopup,
  title,
  initQuestion,
  isEditing,
}) => {
  const { t } = useTranslation();
  const validationSchema = Yup.object().shape({
    section_id: Yup.object().required(t("Section is required")),
    question: Yup.string().required(t("Question is required")),
    description: Yup.string(),
    option_type: Yup.object()
      .shape({
        value: Yup.string().required(t("Option type is required")),
      })
      .required(t("Option type is required!"))
      .nullable(),
    order: Yup.number().required(t("Order number is required")),
    options: Yup.array().when("option_type", {
      is: (optionType) => ["checkbox", "radio"].includes(optionType?.value),
      then: () =>
        Yup.array().of(
          Yup.object().shape({
            value: Yup.string().required(t("Value is required")),
            points: Yup.string().required(t("Points is required")),
          })
        ),
    }),
  });

  const dispatch = useDispatch();
  // const store = useSelector((state) => state.sections);
  // const questionStore = useSelector((state) => state.questions);
  // const assessmentStore = useSelector((state) => state.assessment);

  const [showSnackBar, setshowSnackbar] = useState(false);
  const [snakebarMessage, setSnakbarMessage] = useState("");
  const [sectionList, setSectionList] = useState([]);

  useLayoutEffect(() => {
    // dispatch(getSectionList());
  }, [dispatch]);

  // useEffect(() => {
  //   if (store?.sectionItems && store.actionFlag === "SCTN_LST") {
  //     if (store?.sectionItems?.length > 0) {
  //       let sectionList = [];
  //       sectionList = store?.sectionItems?.map((item) => {
  //         return {
  //           value: item?._id,
  //           label: item?.name,
  //         };
  //       });
  //       setSectionList(sectionList);
  //     }
  //   }
  // }, [store?.sectionItems, store.actionFlag]);

  // useEffect(() => {
  //   if (
  //     (questionStore.actionFlag === "QESTN_CRTD_SCS" ||
  //       questionStore.actionFlag === "QESTN_UPDT_SCS") &&
  //     questionStore.success
  //   ) {
  //     setshowSnackbar(true);
  //     setSnakbarMessage(questionStore.success);
  //   }
  //   if (
  //     (questionStore.actionFlag === "QESTN_CRTD_ERR" ||
  //       questionStore.actionFlag === "QESTN_UPDT_ERR") &&
  //     questionStore.error
  //   ) {
  //     setshowSnackbar(true);
  //     setSnakbarMessage(questionStore.error);
  //   }
  // }, [questionStore.success, questionStore.error, questionStore.actionFlag]);

  // useEffect(() => {
  //   if (
  //     (questionStore.actionFlag === "QESTN_CRTD_SCS" ||
  //       questionStore.actionFlag === "QESTN_UPDT_SCS") &&
  //     showSnackBar
  //   ) {
  //     setTimeout(() => {
  //       closePopup();
  //       setshowSnackbar(false);
  //       setSnakbarMessage("");
  //     }, 2000);
  //   }
  //   if (
  //     (questionStore.actionFlag === "QESTN_CRTD_ERR" ||
  //       questionStore.actionFlag === "QESTN_UPDT_ERR") &&
  //     showSnackBar
  //   ) {
  //     setTimeout(() => {
  //       setshowSnackbar(false);
  //       setSnakbarMessage("");
  //     }, 2000);
  //   }
  // }, [showSnackBar, questionStore.actionFlag]);

  const onSubmit = (values) => {
    const payload = { ...values };
    // values?.status ? (payload.status = 1) : (payload.status = 0);
    // payload.assessment_id = assessmentStore?.assessmentItem?._id;
    // payload?.section_id?.value
    //   ? (payload.section_id = payload.section_id?.value)
    //   : (payload.section_id = "");

    // payload?.option_type
    //   ? (payload.option_type = payload.option_type?.value)
    //   : (payload.option_type = "");
    // if (isEditing) {
    //   dispatch(updateQuestion(payload));
    // } else {
    //   dispatch(createQuestion(payload));
    // }
  };

  const handleChangeOptionType = (values, setFieldValue) => {
    let optionValues = [{ value: "", points: "" }];
    if (["note", "textarea", "text"].includes(values?.option_type?.value)) {
      setFieldValue("options", optionValues);
    }
  };

  return (
    <>
      <Modal
        className="UpdateUserPopup"
        size="lg"
        show={show}
        aria-labelledby="example-modal-sizes-title-lg"
        centered
      >
        <ModalHeader>
          <span
            className="modal-title col-sm-12 "
            id="example-modal-sizes-title-lg"
          >
            <h3 className="border-bottom pb-2 mb-0 mt-0">{title}</h3>
          </span>
          <button type="button" className="Close-button" onClick={closePopup}>
            ×
          </button>
        </ModalHeader>
        <ModalBody>
          <div className="content">
            {showSnackBar && (
              <ReactSnackBar
                Icon={
                  <span>
                    <TiMessages size={25} />
                  </span>
                }
                Show={showSnackBar}
              >
                {snakebarMessage}
              </ReactSnackBar>
            )}
            <Row>
              <Col>
                <Formik
                  initialValues={initQuestion}
                  enableReinitialize={initQuestion}
                  validationSchema={validationSchema}
                  onSubmit={onSubmit}
                >
                  {({ setFieldValue, values, errors, isSubmitting }) => (
                    <Form>
                      <Row className="mb-3">
                        <Col controlId="formGridRole">
                          <Label>{t('Section')}</Label>
                          {sectionList && (
                            <Select
                              name="section_id"
                              className="react-select info"
                              classNamePrefix="react-select"
                              placeholder={t("Select Section...")}
                              value={values.section_id}
                              options={sectionList}
                              onChange={(secVal) => {
                                setFieldValue("section_id", secVal);
                              }}
                            />
                          )}
                          <ErrorMessage
                            name="section_id"
                            component="div"
                            style={{ color: "red" }}
                          />
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col md={12}>
                          <FormGroup controlId="formGridContactNumber">
                            <Label>{t('Question')}</Label>
                            <Field
                              as="textarea"
                              name="question"
                              className="form-control"
                              rows="3"
                            />
                            <ErrorMessage
                              name="question"
                              component="div"
                              style={{ color: "red" }}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col md={12}>
                          <FormGroup controlId="formGridContactNumber">
                            <Label>
                              {t('Description')}
                            </Label>
                            <Field
                              as="textarea"
                              name="description"
                              className="form-control"
                              rows="3"
                            />
                            <ErrorMessage
                              name="description"
                              component="div"
                              style={{ color: "red" }}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col controlId="formGridRole">
                          <Label>{t('Option Type')}</Label>
                          <Select
                            name="option_type"
                            className="react-select info"
                            classNamePrefix="react-select"
                            placeholder={t("Select Section...")}
                            options={questionTypeOptions}
                            value={values?.option_type}
                            onChange={(question) => {
                              setFieldValue("option_type", question);
                              handleChangeOptionType(values, setFieldValue);
                            }}
                          />
                          <ErrorMessage
                            name="option_type"
                            component="div"
                            style={{ color: "red" }}
                          />
                        </Col>
                      </Row>
                      {["note", "textarea", "text"]?.includes(
                        values?.option_type?.value
                      ) && (
                          <Row className="mb-2">
                            <Col

                              controlId="formGridRole"
                            >
                              <Label>{t('Point')}</Label>
                              <Field
                                name={`point`}
                                type="number"
                                className="form-control"
                                placeholder="Enter Points"
                              />
                              <ErrorMessage
                                name={`point`}
                                component="div"
                                style={{ color: "red" }}
                              />
                            </Col>
                          </Row>
                        )}
                      {!["note", "textarea", "text"].includes(
                        values?.option_type?.value
                      ) && <Label>{t('Options')}</Label>}
                      {!["note", "textarea", "text"].includes(
                        values?.option_type?.value
                      ) && (
                          <FieldArray name="options">
                            {({ remove, push }) => (
                              <div>
                                {values.options.map((option, index) => (
                                  <Row key={index} className="mb-2">
                                    <Col md={5}>
                                      <Field
                                        name={`options.${index}.value`}
                                        type="text"
                                        className="form-control"
                                        placeholder="Option Value"
                                      />
                                      <ErrorMessage
                                        name={`options.${index}.value`}
                                        component="div"
                                        style={{ color: "red" }}
                                      />
                                    </Col>
                                    <Col md={5}>
                                      <Field
                                        name={`options.${index}.points`}
                                        type="number"
                                        className="form-control"
                                        placeholder="Points"
                                      />
                                      <ErrorMessage
                                        name={`options.${index}.points`}
                                        component="div"
                                        style={{ color: "red" }}
                                      />
                                    </Col>
                                    {!["note", "textarea", "text"].includes(
                                      values?.option_type?.value
                                    ) &&
                                      values.options?.length > 1 && (
                                        <Col md={2}>
                                          <TiTrash
                                            size={20}
                                            color="#fff"
                                            cursor="pointer"
                                            onClick={() => remove(index)}
                                          />
                                        </Col>
                                      )}
                                  </Row>
                                ))}
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => push({ value: "", points: "" })}
                                >
                                  {t('Add Option')}
                                </button>
                              </div>
                            )}
                          </FieldArray>
                        )}

                      <Row className="mb-2">
                        <Col md={6}>
                          <FormGroup controlId="formGridContactNumber">
                            <Label>
                             {t('Order Number')}
                            </Label>
                            <Field
                              type="number"
                              name="order"
                              className="form-control"
                            />
                            <ErrorMessage
                              name="order"
                              component="div"
                              style={{ color: "red" }}
                            />
                          </FormGroup>
                        </Col>
                        {!["note", "textarea", "text"].includes(
                          values?.option_type?.value
                        ) && (
                            <Col md={3}>
                              <Label>
                                {t('Is Mandatory')} ?
                              </Label>
                              <div className="is-active-container col">
                                <div className="is-active-checked form-check">
                                  <input
                                    type="checkbox"
                                    name="is_mandatory"
                                    className="is-active-checked form-check-input"
                                    checked={values?.is_mandatory}
                                    id="Yes"
                                    onChange={(event) =>
                                      setFieldValue(
                                        event?.target?.name,
                                        event?.target?.checked
                                      )
                                    }
                                  />
                                  <label
                                    title="Yes"
                                    htmlFor="Yes"
                                    className="pl-3 mb-0"
                                  >
                                    {t('Yes')}
                                  </label>
                                  {/* {errors?.isActive && <div style={{ color: 'red' }}>{errors.isActive}</div>} */}
                                </div>
                              </div>
                            </Col>
                          )}

                        <Col md={3}>
                          <Label>{t('Status')}</Label>
                          <div className="status-container d-flex row-cols-2">
                            <div className="form-check">
                              <input
                                type="radio"
                                name="status"
                                value={1}
                                checked={values?.status === 1}
                                // className="form-check-input"
                                // checked={values?.status === 1}
                                id="Active"
                                onChange={(event) =>
                                  setFieldValue(
                                    "status",
                                    Number(event.target.value)
                                  )
                                }
                                aria-label="Active Status"
                              />
                              <label
                                htmlFor="Active"
                                className="form-check-label"
                              >
                                {t('Active')}
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                type="radio"
                                name="status"
                                value={0}
                                checked={values?.status === 0}
                                // className="form-check-input"
                                // checked={values?.status === 0}
                                id="InActive"
                                onChange={(event) =>
                                  setFieldValue(
                                    "status",
                                    Number(event.target.value)
                                  )
                                }
                                aria-label="InActive Status"
                              />
                              <label
                                htmlFor="Inactive"
                                className="form-check-label"
                              >
                                {t('InActive')}
                              </label>
                            </div>
                          </div>
                        </Col>
                      </Row>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {t('Submit')}
                      </button>
                    </Form>
                  )}
                </Formik>
              </Col>
            </Row>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default QuestionModel;

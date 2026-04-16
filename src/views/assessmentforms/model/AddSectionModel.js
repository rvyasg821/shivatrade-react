// ** React Imports
import React from "react";
import { useDispatch } from "react-redux";
import {
  Col,
  Label,
  Modal,
  Button,
  ModalBody,
  ModalHeader,
  Row,
  Input,
  FormFeedback,
  FormGroup
} from "reactstrap";

import { Formik, Field, ErrorMessage, Form } from "formik";
import * as Yup from "yup";
import { createSection, getSectionByQuestions, updateSection } from "../add/questionStore";
import { useTranslation } from "react-i18next";
const AddSectionModel = ({
  show,
  closePopup,
  initialValues,
  id,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const validationSchema = Yup.object({
    name: Yup.string().required(t("Name is required.")),
    description: Yup.string().required(t("Description is required."))
  });
  const onSubmit = (values) => {
    if (values) {
      const payload = {
        ...values,
        assessment_id: id  
      };
      if (payload?._id) {
        dispatch(updateSection({ id: payload?._id, payload })).then(() => {
          closePopup()
          dispatch(getSectionByQuestions(id))
        })
      } else {

        dispatch(createSection(payload)).then(() => {
          closePopup()
          dispatch(getSectionByQuestions(id))
        })
      }
    }
  };

  return (
    <Modal
      isOpen={show}
      toggle={closePopup}
      onClosed={() => { }}
      className="modal-dialog-centered modal-lg main-content"
    >
      <ModalHeader className="bg-transparent" toggle={closePopup}>
        <h3 className="text-center p-1">{initialValues?._id ? t("Edit") : t("Add")} {t('Section')}</h3>
      </ModalHeader>
      <ModalBody className="">
        <Formik
          initialValues={initialValues}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
        >
          {({ values, setFieldValue, isSubmitting, errors, touched }) => (
            <Form tag="form">
              <Row>
                
                <Col xs={12} className="mb-2">
                  <Label className="form-label" for="name">
                    {t('Name')}
                  </Label>
                  <Field name="name">
                    {({ field }) => (
                      <Input
                        {...field}
                        id="name"
                        placeholder={t("Enter section name")}
                        invalid={!!(errors.name && touched.name)}
                      />
                    )}
                  </Field>
                  <ErrorMessage name="name" component={FormFeedback} />
                </Col>

                <Col xs={12} className="mb-2">
                  <Label className="form-label" for="description">
                    {t('Description')}
                  </Label>
                  <Field name="description">
                    {({ field }) => (
                      <Input
                        {...field}
                        id="description"
                        type="textarea"
                        rows="3"
                        placeholder="Enter description"
                        invalid={!!(errors.description && touched.description)}
                      />
                    )}
                  </Field>
                  <ErrorMessage name="description" component={FormFeedback} />
                </Col>

                <Col md="6" className="d-none">
                  <FormGroup>
                    <Label for="order">{t('Order')}</Label>
                    <Field name="order">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="order"
                          type="number"
                          invalid={!!(errors.order && touched.order)}
                        />
                      )}
                    </Field>
                    <ErrorMessage name="order" component={FormFeedback} />
                  </FormGroup>
                </Col>

                <Col xs={12} className="mb-2">
                  <Label className="form-label">{t('Status')}</Label>
                  <div className="d-flex gap-4">
                    <FormGroup check inline>
                      <Input
                        type="radio"
                        name="status"
                        id="status-active"
                        value={1}
                        checked={values?.status === 1}
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
                        checked={values?.status === 2}
                        onChange={() => setFieldValue("status", 2)}
                      />
                      <Label check for="status-inactive">
                        {t('Inactive')}
                      </Label>
                    </FormGroup>
                  </div>
                </Col>
              </Row>

              <Col className="text-center" xs={12}>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isSubmitting ? t("Submitting...") : t("Submit")}
                </Button>
              </Col>
            </Form>
          )}
        </Formik>
      </ModalBody>
    </Modal>
  );
};

export default AddSectionModel;
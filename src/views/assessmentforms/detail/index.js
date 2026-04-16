// ** React Imports
import React, { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getSectionByQuestions } from "../add/questionStore";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Label,
  Button,
  CardBody,
  Collapse,
  CardHeader,
  CardTitle,
} from "reactstrap";
import classNames from "classnames";

import openedIcon from "../../../assets/images/svg/openedPolygon.svg";
import closedIcon from "../../../assets/images/svg/closedpolygon.png";
import { useTranslation } from "react-i18next";
const AssessmentFormDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const sectionStore = useSelector((state) => state.SectionAssessment);
  const optionsType = ["radio", "checkbox"];

  const [selectedAccordion, setSelectedAccordion] = useState(undefined);
  const [questionItems, setQuestionsItems] = useState([]);

  const handleQuestionsList = useCallback(async () => {
    try {
      dispatch(startLoading());
      const result = await dispatch(getSectionByQuestions(id)).unwrap();
      setQuestionsItems(result?.sectionItems || []);
    } catch (error) {
      setQuestionsItems([]);
    } finally {
      dispatch(stopLoading());
    }
  }, [id, dispatch]);

  useLayoutEffect(() => {
    handleQuestionsList();
  }, [handleQuestionsList]);

  useEffect(() => {
    if (sectionStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [sectionStore?.loading]);

  return (
    <div className="main-content">
      <Row>
        <Col>
          <div className="p-0 role-name d-flex justify-content-between mb-2">
            <h3 className="card-title mb-0 mt-0" />
            <Button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/apps/assessment-forms")}
            >
              {t('Back')}
            </Button>
          </div>
        </Col>
      </Row>

      <Card className="global-management">
        <CardBody className=" assesment-detail">
          {questionItems.length
            ? questionItems.map((section, secIdx) => {
              if (!section.questions?.length) return null;
              const isOpen = selectedAccordion === secIdx;
              return (
                <div
                  key={`sec_${secIdx}`}
                  className={classNames("accrodion-permi ", {
                    "accordion-border-left": isOpen,
                  })}
                >
                  <button
                    type="button"
                    className="w-100 p-1 border-0 d-flex justify-content-between align-items-center permission-accordion"
                    onClick={() => {
                      setSelectedAccordion(isOpen ? undefined : secIdx);
                    }}
                  >
                    <CardTitle tag="h5" className="mb-0">
                      {section?.section_name}
                    </CardTitle>
                    <span className="check-box-permission">
                      <img
                        src={isOpen ? openedIcon : closedIcon}
                        alt={isOpen ? "open" : "close"}
                      />
                    </span>
                  </button>

                  <Collapse isOpen={isOpen}>
                    <div className="p-1 pt-0 gobal-input">
                      <Row>
                        {section.questions.map((question, qIdx) => (
                          <Fragment key={`q_${question?._id}_${qIdx}`}>
                            <Col xl={10} lg={10} md={8} className="mb-1" >
                              <Label className="text-white">
                                <strong>{`Q${qIdx + 1}:`}</strong> {question.question}
                              </Label>
                            </Col>
                            <Col xl={2} lg={2} md={4} className="text-end">
                              <Label className="text-white text-capitalize">
                                {question.option_type}
                              </Label>
                            </Col>
                            {question?.options?.length &&
                              optionsType.includes(question.option_type) ? (
                              <Col xs={12} className="options-input">
                                {question.option_type === "checkbox" ? (
                                  <div className="d-flex flex-wrap">
                                    {question.options.map((opt, optIdx) => (
                                      <div
                                        key={`opt_${opt.value}_${optIdx}`}
                                        className="d-flex align-items-center mb-1"
                                      >
                                        <input
                                          disabled
                                          type="checkbox"
                                          id={`opt_${opt.value}_${optIdx}`}
                                          className="form-check-input"
                                        />
                                        <Label
                                          htmlFor={`opt_${opt.value}_${optIdx}`}
                                          className="text-white mb-0"
                                        >
                                          {opt?.value || ""}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="d-flex flex-wrap">
                                    {question.options.map((opt, optIdx) => (
                                      <div
                                        key={`opt_${opt.value}_${optIdx}`}
                                        className="form-check form-check-inline mb-1"
                                      >
                                        <input
                                          disabled
                                          type="radio"
                                          name={`q_${question?._id}`}
                                          id={`opt_${opt.value}_${optIdx}`}
                                          className="form-check-input"
                                        />
                                        <Label
                                          htmlFor={`opt_${opt.value}_${optIdx}`}
                                          className="text-white mb-0"
                                        >
                                          {opt.value}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </Col>
                            ) : null}
                          </Fragment>
                        ))}
                      </Row>
                    </div>
                  </Collapse>
                </div>
              );
            })
            : null}
        </CardBody>
      </Card>
    </div>
  );
};

export default AssessmentFormDetail;
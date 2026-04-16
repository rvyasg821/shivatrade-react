
// ** React Imports
import React, { Fragment, useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
// import { getAssessmentReportAnswersList } from "views/userAssest/store";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Label,
  Button,
  Collapse,
  CardBody,
  Input,
  FormGroup
} from "reactstrap";

// ** Third Party Components
import classNames from "classnames";

import openedIcon from "../../../../assets/images/svg/openedPolygon.svg"
import closedIcon from "../../../../assets/images/svg/closedpolygon.png"
import { getAssessmentReportQuestions } from "../../userAssest/store";
import { useTranslation } from "react-i18next";
const AssessmentReportPreview = () => {
  // ** Hooks
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const assessmentId = queryParams.get("asessmentId");
const { t } = useTranslation();
  // ** Store Vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.assessmentReport);
  console.log('AssessmentReportPreview STORE ==>', store);

  // ** Const
  const optionsType = ["text", "textarea", "date", "radio", "checkbox"]

  // ** State
  const [selectedAccordion, setSelectedAccordion] = useState();
  const [totalPoints, setTotalPoints] = useState([]);
  const [totalMaxPoints, setTotalMaxPoints] = useState([]);
  const [totalPercentage, setTotalPercentage] = useState("0%");

  const handlePreviewReport = useCallback(() => {
    const query = {
      assessment_id: assessmentId,
      asessment_report_id: id
    }
    dispatch(getAssessmentReportQuestions(query))
  }, [assessmentId, id, dispatch])

  useEffect(() => {
    handlePreviewReport()
  }, [handlePreviewReport])

  useEffect(() => {
    // Only proceed if score calculation is enabled
    if (store?.questions?.assessment_show_score_calculation) {
      // Make a copy of the current totalPoints to avoid direct mutation
      const updatedPoints = [...totalPoints];
      const updatedOverAllSectionScore = [...totalMaxPoints];
      let OverAllPontsTotal = 0;
      let OverAllPoints = 0;
      // Loop through each section
      store?.questions?.sections.forEach((section, sectionIndex) => {
        let sectionTotalPoints = 0;
        let overAllSectionScore = 0;
        // Loop through the questions in the section
        section.questions.forEach((question) => {
          if (question.option_type === "radio") {
            // Get the options and the user's selected answer
            const selectedAnswer = question.answerDetails?.value;
            const options = question.options;

            // Find the option with the maximum points (if needed)
            const maxPointsOption = options.reduce(
              (max, current) => {
                return current.points > max.points ? current : max;
              },
              { points: 0 }
            );

            // If the selected answer matches an option, get the points for that option
            const selectedOption = options.find(
              (option) => option?.value === selectedAnswer
            );
            const selectedPoints = selectedOption ? selectedOption.points : 0;

            // Add the selected points to the total for this section
            sectionTotalPoints += selectedPoints;
            overAllSectionScore += maxPointsOption?.points || 0;
            OverAllPoints += maxPointsOption?.points || 0;
            OverAllPontsTotal += selectedPoints;
          }
        });

        // Update the totalPoints array at the specific index of the section
        updatedPoints[sectionIndex] = sectionTotalPoints;
        updatedOverAllSectionScore[sectionIndex] = overAllSectionScore;
      })

      // Set the updated total points for each section
      setTotalPoints(updatedPoints);
      setTotalMaxPoints(updatedOverAllSectionScore);

      setTotalPercentage(`${((OverAllPontsTotal * 100) / OverAllPoints).toFixed(2)}%`);
    }
  }, [store?.questions])

  return (
    <div className="global-management global-preview">
      <div className="container-fluid">
        <Row>
          <Col xl={12} lg={12} md={12} className="mb-4 p-0">
            <Card className="m-0 p-2">
              <div className="role-name d-flex justify-content-between border-bottom mb-2 pb-2">
                <h3 className="card-title mb-0 mt-0 pr-1">{store.questions?.assessment_name}</h3>
                <h4 className="card-title mb-0 mt-0 text-right">{store?.questions?.assessment_show_score_calculation ? `Overall score: ${totalPercentage}` : null}</h4>
              </div>

              <CardBody className="m-0 p-0 assesment-detail">
                {store.questions?.sections?.length ? (
                  store.questions?.sections.map((section, sInd) => (
                    section?.questions?.length ? (
                      <div key={`div_${sInd}_${section?.name}`} className={classNames("accrodion-permi", {
                        "accordion-border-left": selectedAccordion === sInd
                      })}>
                        <Button
                          color="link"
                          className="w-100 p-1 border-0 d-flex justify-content-between align-items-center permission-accordion"
                          onClick={() => {
                            setSelectedAccordion(sInd);
                            if (sInd === selectedAccordion) {
                              setSelectedAccordion();
                            }
                          }}
                          aria-expanded={selectedAccordion === sInd}
                        >
                          <div className="d-flex justify-content-between align-items-center w-100">
                            <h5 className="mb-0 card-title w-75">{section?.name}</h5>

                            {store?.questions?.assessment_show_score_calculation ? (
                              <span className="text-white mb-0 w-25 text-end right-percent">
                                {totalMaxPoints[sInd] > 0 ? `${((totalPoints[sInd] * 100) / totalMaxPoints[sInd]).toFixed(2)}%` : "0%"}
                                {`(${totalPoints[sInd]} / ${totalMaxPoints[sInd]})`}
                              </span>
                            ) : null}
                          </div>

                          {selectedAccordion === sInd ? (
                            <span className="check-box-permission"><img alt="Open" src={openedIcon} /></span>
                          ) : (
                            <span className="check-box-permission"><img alt="Close" src={closedIcon} /></span>
                          )}
                        </Button>

                        <Collapse isOpen={selectedAccordion === sInd} className='p-1 pt-0 gobal-input'>
                          {section?.questions?.length ? (
                            <Row>
                              {section?.questions?.map((question, qInd) => (
                                <Fragment key={`custom_${question?._id}-${qInd}`}>
                                  <Col xl={10} lg={10} md={8} className="mb-1" >
                                    <Label className="col-label w-100">{`Q${qInd + 1}`}: {question.question}</Label>
                                  </Col>

                                  <Col xl={2} lg={2} md={4} className="text-end">
                                    <Label className="col-label w-100 text-capitalize">{question.option_type}</Label>
                                  </Col>
                                  {
                                    console.log(question, "question")

                                  }
                                  {optionsType.includes(question.option_type) ? (
                                    <Col xl={12} lg={12} md={12} className="options-input">
                                      {question?.options?.length && question.option_type === "checkbox" ?

                                        (
                                          <div className="d-flex flex-wrap">
                                            {question.options.map((option, optInd) => (
                                              <div className="d-flex align-items-center mb-1">
                                                <Input
                                                  type="checkbox"
                                                  id={`${option.value}-${optInd}`}
                                                  disabled={true}
                                                  checked={question.value?.split(",")?.includes(option.value)}
                                                  className="form-check-input"
                                                />
                                                <Label
                                                  check
                                                  for="show_score_calculation"
                                                  className="mb-0 user-select-none"
                                                  style={{ cursor: "pointer" }}
                                                >
                                                  {option?.value || ""}
                                                </Label>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                        : question?.options?.length && question.option_type === "radio" ?
                                          (
                                            <div className="d-flex flex-wrap">
                                              {question.options.map((option, optInd) => (
                                                <FormGroup check inline>
                                                  <Input
                                                    type="radio"
                                                    name="status"
                                                    id={`${option.value}-${optInd}`}
                                                    value={option.value}
                                                    disabled={true}
                                                    checked={option.value === question.value}
                                                  />
                                                  <Label check for="status-active">
                                                    {option.value}
                                                  </Label>
                                                </FormGroup>
                                              ))}
                                            </div>
                                          )
                                          :
                                          (
                                            <p className="mb-0 text-white">
                                              {t('Ans')}: {question?.value || ""}
                                            </p>
                                          )}
                                    </Col>
                                  ) : null}
                                </Fragment>
                              ))}
                            </Row>
                          ) : null}
                        </Collapse>
                      </div>
                    ) : null
                  ))
                ) : null}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default AssessmentReportPreview;

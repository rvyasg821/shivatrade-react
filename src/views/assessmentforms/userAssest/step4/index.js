import React, { useState, useLayoutEffect, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { Card, Row, Col, CardBody } from "reactstrap";

import thankYouImg from "../../../../assets/images/svg/thankyouicon.svg"
import { generatePdf, generatePdfEmail, getQuestionAnswer } from "../step3/store";
import { startLoading, stopLoading } from "../../../loadingstore";
import Notification from "../../../../@core/components/toast/notification";
import { htmlToString, setInnerHtml } from "../../../../utility/Utils";
import { assessmentReportPdfUrl } from "../../../../constants/defaultValues";
import { useTranslation } from 'react-i18next';

const ThankYou = () => {
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const { t } = useTranslation();
   
    const dispatch = useDispatch();

    const assessmentReportId = queryParams.get("id");
    const tenatID = queryParams.get("tenantId");

    const [totalPoints, setTotalPoints] = useState([])
    const [totalMaxPoints, setTotalMaxPoints] = useState([])
    const [totalPercentage, setTotalPercentage] = useState('0%')
    const assessmentReport = useSelector((state) => state.questionAnswer)

    const handleDownloadPdf = async () => {
        const payload = {
            assessment_id: id,
            asessment_report_id: assessmentReportId,
        };
        await dispatch(generatePdf({id:tenatID,data:payload}))
        const url = `${assessmentReportPdfUrl}/files/assessment-report/${assessmentReportId}.pdf`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    useLayoutEffect(() => {
        const params = {
            assessment_id: id,
            asessment_report_id: assessmentReportId,
        };
        dispatch(getQuestionAnswer({id:tenatID,data:params}));
    }, [dispatch, assessmentReportId, id]);

    const handleSendEmailPdf = async () => {
        const payload = {
            assessment_id: id,
            asessment_report_id: assessmentReportId,
        };
        //SENT EMAIL API
        await dispatch(generatePdfEmail({id:tenatID,data:payload})).then((res) => {
            if (res?.payload?.actionFlag === "GENERATE_PDF_EMAIL_SUCCESS") {
                Notification("Success", res?.payload?.success || "PDF emailed successfully", "success");
            }
        });
    };

    useEffect(() => {
        if (assessmentReport?.questionAnswer?.assessment_show_score_calculation) {
            const updatedPoints = [...totalPoints];
            const updatedOverAllSectionScore = [...totalMaxPoints];
            let OverAllPontsTotal = 0;
            let OverAllPoints = 0;

            assessmentReport?.questionAnswer?.sections.forEach((section, sectionIndex) => {
                let sectionTotalPoints = 0;
                let overAllSectionScore = 0;

                section.questions.forEach((question) => {
                    if (question.option_type === "radio") {
                        const selectedAnswer = question.answerDetails?.value;
                        const options = question.options || [];

                        const maxPointsOption = options.reduce((max, current) => {
                            const currentPoints = Number(current.points) || 0;
                            const maxPoints = Number(max.points) || 0;
                            return currentPoints > maxPoints ? current : max;
                        }, { points: 0 });

                        const selectedOption = options.find(
                            (option) => option?.value === selectedAnswer
                        );

                        const selectedPoints = Number(selectedOption?.points) || 0;
                        const maxPoints = Number(maxPointsOption?.points) || 0;

                        sectionTotalPoints += selectedPoints;
                        overAllSectionScore += maxPoints;

                        OverAllPoints += maxPoints;
                        OverAllPontsTotal += selectedPoints;
                    }
                });

                updatedPoints[sectionIndex] = sectionTotalPoints;
                updatedOverAllSectionScore[sectionIndex] = overAllSectionScore;
            });

            setTotalPoints(updatedPoints);
            setTotalMaxPoints(updatedOverAllSectionScore);

            const percentage = OverAllPoints > 0
                ? ((OverAllPontsTotal * 100) / OverAllPoints).toFixed(2)
                : 0;

            setTotalPercentage(`${percentage}%`);
        }
    }, [assessmentReport?.questionAnswer]);

    useEffect(() => {
        if (assessmentReport?.loading) {
            dispatch(startLoading());
        } else {
            dispatch(stopLoading());
        }
    }, [assessmentReport?.loading]);

    return (
        <div className="step-wise-content vh-100">
            <Row className="sticky--- m-0 thank-you-sticky">
                <Col className="right-side thank-you">
                    <div className="card-header">
                        <h3 className="m-0">{t('THANK YOU')}</h3>
                    </div>

                    <Card className="">

                        <div className="pl-0 pr-0">
                            <div className="row-row">
                                {!assessmentReport?.questionAnswer?.assessment_show_score_calculation ? (<>

                                    <div className="thank-name text-center">
                                        <h3 className="m-0">{t('THANK YOU !')}</h3>
                                    </div>
                                    <div className="text-center">
                                        <img alt="..." src={thankYouImg} className="mb-3" />
                                    </div>
                                </>) : (<>
                                    <div className="thank-name text-center">
                                        <h3 className="m-0 p-0">{` ${assessmentReport?.questionAnswer?.assessment_name} Results`}</h3>
                                    </div>

                                    <div role="alert" className="warn-progress  text-center">
                                        <div className="main-warning">
                                            <strong className="fs-3 warning">{t('Warning!')}</strong> <span className="text-white">{t('We recommend discussing budget allocations to strengthen your defenses. The NIST Framework can help identify weaknesses and guide where to allocate funds effectively')}.</span>
                                        </div>

                                        <div className="progress">
                                            <div
                                                className="progress-bar"
                                                role="progressbar"
                                                style={{ width: totalPercentage }}
                                                aria-valuenow={totalPercentage}
                                                aria-valuemin="0"
                                                aria-valuemax="100"
                                            >
                                                {totalPercentage}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row h-100 thanks-card text-center custom-sections-wrapper">
                                        {assessmentReport?.questionAnswer?.sections.map((section, index) => (
                                            <div className="col-lg-5 col-md-6 mt-2 mt-md-3">
                                                <CardBody className="sub-card">
                                                    <h3 className="section-title">{section.name}</h3>
                                                    <p className="section-description">{section.description}</p>
                                                    <p className="section-score">
                                                        {totalPoints[index] || 0}/{totalMaxPoints[index] || 0}
                                                    </p>
                                                    <p className="section-percent mb-0">
                                                        {totalMaxPoints[index] > 0 ? `${((totalPoints[index] * 100) / totalMaxPoints[index]).toFixed(2)}%` : "0%"}
                                                    </p>
                                                </CardBody>
                                            </div>
                                        ))}
                                    </div>
                                </>)}
                                <div className="buttons d-flex justify-content-center both-btn">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleSendEmailPdf()}
                                    >
                                        {t('Send Report to Email')}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleDownloadPdf()}
                                    >
                                        {t('Download Report')}
                                    </button>
                                </div>

                                {htmlToString(assessmentReport?.questionAnswer?.assessment_additional_description) ? (
                                    setInnerHtml(assessmentReport?.questionAnswer?.assessment_additional_description, "draft-editor-content-view mt-3 text-white text-center")
                                ) : null}
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

export default ThankYou;

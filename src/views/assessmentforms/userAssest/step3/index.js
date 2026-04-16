/* eslint-disable object-shorthand */
import React, { useState, useLayoutEffect, useMemo, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody } from "reactstrap";

import { getQuestionAnswer } from "./store";
import DynamicInput from "../../../components/AssessmentReportQuestionType/DynamicInput";
import { createAnswer, updateAnswer } from "../reportAnswerStore";
import { startLoading, stopLoading } from "../../../loadingstore";
import { useTranslation } from 'react-i18next';

const AsessmentReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const dispatch = useDispatch();
  const assessmentReport = useSelector((state) => state.questionAnswer);
  const answerSlice = useSelector((state) => state.answerSlice);

  const assessmentReportId = queryParams.get("id");
  const tenantID = queryParams.get("tenantId");

  const [showIntro, setShowIntro] = useState(true);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [value, setValue] = useState(undefined);
  const [error, setError] = useState(false);
  const [childVal, setChildVal] = useState([]);
  const [childOptions, setChildOptions] = useState([]);
  const [proggress, setProggress] = useState(0);
  const [perQuestionProggressRate, setPerQuestionProggressRate] = useState(0);

  useLayoutEffect(() => {
    const params = { assessment_id: id, asessment_report_id: assessmentReportId };
    dispatch(getQuestionAnswer({ id: tenantID, data: params }));
  }, [dispatch, id, assessmentReportId, tenantID]);

  useMemo(() => {
    const sections = assessmentReport?.questionAnswer?.sections;
    if (!sections || sections.length === 0) return;
    const totalQuestions = sections.reduce((sum, sec) => sum + sec.questions.length, 0);
    if (totalQuestions > 0) {
      setPerQuestionProggressRate(Math.ceil(100 / totalQuestions));
    }
  }, [assessmentReport?.questionAnswer?.sections]);

  useEffect(() => {
    if (showIntro) return;

    const question = assessmentReport?.questionAnswer?.sections?.[sectionIndex]?.questions?.[questionIndex];
    if (!question) return;

    if (question.answerDetails?.value !== undefined) {
      if (question.option_type === "checkbox") {
        setValue(question.answerDetails.value ? question.answerDetails.value.split(",") : []);
      } else {
        setValue(question.answerDetails.value || "");
      }
    } else {
      setValue(question.option_type === "checkbox" ? [] : "");
    }

    if (question.childQuestions?.length > 0) {
      const values = question.childQuestions.map((c) => c.answerDetails?.value || "");
      setChildVal(values);
      const checkboxChild = question.childQuestions.find((c) => c.option_type === "checkbox");
      setChildOptions(checkboxChild?.options || []);
    } else {
      setChildVal([]);
      setChildOptions([]);
    }
  }, [questionIndex, sectionIndex, assessmentReport, showIntro]);

  useEffect(() => {
    if (answerSlice?.actionFlag === "ANSWER_CREATE_SUCCESS" || answerSlice?.actionFlag === "ANSWER_UPDATE_SUCCESS") {
      dispatch(getQuestionAnswer({ id: tenantID, data: { assessment_id: id, asessment_report_id: assessmentReportId } }));
    }
  }, [answerSlice?.actionFlag]);

  useEffect(() => {
    answerSlice?.loading ? dispatch(startLoading()) : dispatch(stopLoading());
  }, [answerSlice?.loading]);

  const handleNextClick = () => {
    const sections = assessmentReport?.questionAnswer?.sections;
    if (!sections || sections.length === 0) return;

    if (showIntro) {
      setShowIntro(false);
      setProggress(perQuestionProggressRate);
      setError(false);
      setValue(undefined);
      return;
    }

    const currentQuestion = sections[sectionIndex]?.questions?.[questionIndex];
    if (!currentQuestion) return;

    // Skip validation & error for "note" type
    if (currentQuestion.option_type === "note") {
      setError(false);
      moveToNext();
      return;
    }

    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

    if (currentQuestion.is_mandatory && isEmpty) {
      setError(true);
      return;
    }

    setError(false);
    saveCurrentAnswer(currentQuestion, sections);
    moveToNext();
  };

  const saveCurrentAnswer = (currentQuestion, sections) => {
    const payload = {
      section_id: sections[sectionIndex]._id,
      question_id: currentQuestion._id,
      question_data: {
        description: currentQuestion.description || "",
        question: currentQuestion.question,
        option_type: currentQuestion.option_type,
        options: currentQuestion.options || [],
        is_mandatory: currentQuestion.is_mandatory,
      },
      asessment_report_id: assessmentReportId,
      value: currentQuestion.option_type === "checkbox" ? (Array.isArray(value) ? value.join(",") : "") : value || "",
    };

    if (currentQuestion.option_type === "radio" && value) {
      const selected = currentQuestion.options?.find((opt) => opt.value === value);
      if (selected) payload.question_data.score = selected.points || 0;
    }

    if (currentQuestion.answerDetails?._id) {
      payload._id = currentQuestion.answerDetails._id;
      dispatch(updateAnswer({ id: tenantID, data: payload }));
    } else {
      dispatch(createAnswer({ id: tenantID, data: payload }));
    }

    if (currentQuestion.childQuestions?.length > 0) {
      currentQuestion.childQuestions.forEach((child, idx) => {
        const childValue = childVal[idx];
        if (childValue === undefined && !child.is_mandatory) return;

        const childPayload = {
          section_id: sections[sectionIndex]._id,
          question_id: child._id,
          question_data: {
            description: child.description || "",
            question: child.question,
            option_type: child.option_type,
            options: child.option_type === "checkbox" && child.options[0]?.value === ""
              ? childOptions.map((opt, i) => ({ value: opt.value, points: child.options[i]?.points || 0 }))
              : child.options || [],
            is_mandatory: child.is_mandatory,
          },
          asessment_report_id: assessmentReportId,
          value: childValue || "",
          parent_question_id: currentQuestion._id,
        };

        if (child.answerDetails?._id) {
          childPayload._id = child.answerDetails._id;
          dispatch(updateAnswer({ id: tenantID, data: childPayload }));
        } else {
          dispatch(createAnswer({ id: tenantID, data: childPayload }));
        }
      });
    }
  };

  const moveToNext = () => {
    const sections = assessmentReport.questionAnswer.sections;
    const totalInSection = sections[sectionIndex].questions.length;

    if (questionIndex < totalInSection - 1) {
      setQuestionIndex(prev => prev + 1);
    } else if (sectionIndex < sections.length - 1) {
      setSectionIndex(prev => prev + 1);
      setQuestionIndex(0);
    } else {
      setProggress(100);
      const params = new URLSearchParams();
      params.set("id", assessmentReportId);
      if (tenantID) params.set("tenantId", tenantID);
      navigate(`/assessment-form/${id}/thankyou?${params.toString()}`);
      return;
    }

    setProggress(prev => Math.min(100, prev + perQuestionProggressRate));
    setValue(undefined);
    setChildVal([]);
    setChildOptions([]);
  };

  const handlePreviousClick = () => {
    // ... (same as before)
    if (showIntro) {
      const params = new URLSearchParams();
      params.set("id", assessmentReportId);

      if (tenantID) {
        params.set("tenantId", tenantID);
      }

      navigate(`/assessment-form/${id}?${params.toString()}`);
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1);
    } else if (sectionIndex > 0) {
      setSectionIndex(prev => prev - 1);
      setQuestionIndex(assessmentReport.questionAnswer.sections[sectionIndex - 1].questions.length - 1);
    } else {
      setShowIntro(true);
      setProggress(0);
    }
    setError(false);
    setProggress(prev => Math.max(0, prev - perQuestionProggressRate));
  };

  const currentQuestion = !showIntro && assessmentReport?.questionAnswer?.sections?.[sectionIndex]?.questions?.[questionIndex];
  const isLastQuestion = assessmentReport?.questionAnswer?.sections && sectionIndex === assessmentReport.questionAnswer.sections.length - 1 && questionIndex === assessmentReport.questionAnswer.sections[sectionIndex].questions.length - 1;
 const { t } = useTranslation();
  return (
    <CardBody className="full-height full-width main-content">
      <div><h3 className="mb-2">{t('Self Assessment')}</h3></div>
      <Card>
        <div className="assesment-card">

          {showIntro && (
            <>
              <div className="assesment-heading"><h3 className="m-0">{assessmentReport?.questionAnswer?.assessment_name}</h3></div>
              <p className="description text-white mt-2">{assessmentReport?.questionAnswer?.assessment_description}</p>
              <ol className="li-section-title text-white">
                {assessmentReport?.questionAnswer?.allSections?.map(sec => <li key={sec._id}>{sec.name}</li>)}
              </ol>
            </>
          )}

          {!showIntro && currentQuestion && (
            <>
              <div className="assesment-heading"><h3 className="m-0">{assessmentReport.questionAnswer.sections[sectionIndex].name}</h3></div>
              <p className="description text-white my-2">{assessmentReport.questionAnswer.sections[sectionIndex].description}</p>
              <div className="section-title text-white mb-2">Q {questionIndex + 1} - {currentQuestion.question}</div>

              {currentQuestion.option_type !== "note" && (
                <DynamicInput
                  type={currentQuestion.option_type}
                  options={currentQuestion.options}
                  value={value}
                  onChange={setValue}
                  writtenOptions={childOptions}
                  onChangeOptions={setChildOptions}
                />
              )}

              {currentQuestion.childQuestions?.map((child, idx) => (
                <div key={child._id} className="mt-3">
                  <p className="text-white">({idx + 1}) {child.question}</p>
                  <DynamicInput
                    type={child.option_type}
                    options={child.options}
                    value={childVal[idx] || ""}
                    onChange={(val) => {
                      const newVals = [...childVal];
                      newVals[idx] = val;
                      setChildVal(newVals);
                    }}
                  />
                </div>
              ))}

              {/* FIXED: Only show error if NOT a note question */}
              {error && currentQuestion.option_type !== "note" && (
                <div className="text-danger mt-2">{t('This question is required!')}</div>
              )}

              <div className="question-description text-white mt-2">
                <p>{currentQuestion.description}</p>
              </div>
            </>
          )}

          {assessmentReport?.questionAnswer?.assessment_show_score_calculation && (
            <div className="progress mb-4 mt-5">
              <div className="progress-bar bg-primary" style={{ width: `${proggress}%` }}>
                {t('proggress')}%
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between mt-5">
            <button className="btn btn-primary" onClick={handlePreviousClick}>
              {showIntro ? t("Back") : t("Previous")}
            </button>
            <button className="btn btn-primary" onClick={handleNextClick}>
              {showIntro ? "Start Assessment" : isLastQuestion ? t("Submit") : t("Next")}
            </button>
          </div>
        </div>
      </Card>
    </CardBody>
  );
};

export default AsessmentReport;
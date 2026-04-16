// ** React Imports
import React, { useState, useRef, Fragment } from "react";
import { useSelector } from "react-redux";

// ** Reactstrap Imports
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";

// ** Third Party Components
import classnames from "classnames";

import AssessmentForm from "./assessmentform";
import AssessmentQuestion from "./addquestionassessment";
import AssesmentTabView from "../AssesmentTabView";
import { useLocation } from "react-router-dom";

const Assessment = () => {
  const childFunc = useRef(null);
  // const questionStore = useSelector((state) => state.questions);
  const location = useLocation();
  const fromPage = location.state?.from
  const isDisabled = fromPage === "addBtn";
 
  const [activeTab, setActiveTab] = useState("1");
  const [questionActivated, setQuestionActivated] = useState(false);
  const [triggered, setTrigger] = useState(false);

  const toggle = (tab) => {
    if (activeTab !== tab) {
      if (tab === "2" && questionActivated) {
        setActiveTab(tab);
      }
      if (tab === "1") {
        setActiveTab(tab);
      }
    }
  }

  const toggleQuestion = () => {
    setQuestionActivated(() => true);
    setActiveTab("2");
  }

  return (
    <Fragment>
      <AssesmentTabView isDisabled={isDisabled}  mode="add" />
    </Fragment>
  )
}

export default Assessment;

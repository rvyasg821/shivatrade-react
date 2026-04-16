import { Fragment } from "react";
import AssesmentTabView from "../AssesmentTabView";
import { useLocation, useParams } from "react-router-dom";

const Editassessment = () => {
  
  const { id } = useParams(); 
  const location = useLocation();
  const openQuestionTab = location.state?.openQuestionTab;

  return (
    <Fragment>
      <AssesmentTabView id={id} mode="edit" openQuestionTab={openQuestionTab} />
    </Fragment>
  )
}

export default Editassessment;

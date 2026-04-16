import { Fragment, useState } from "react"
import { Col, Row } from "reactstrap"
import Tabs from "./tabs";
import TabContents from "./tabContents";
import { useParams } from "react-router-dom";


const AssessmentReportFront = () => {
    const companyDetails = "company-details";
    const questionAnswers = "question-answers";
    const { id } = useParams();

    const [active, setActive] = useState(companyDetails);

    const toggleTab = (tab) => {
        if (active !== tab) {
            setActive(tab);
        }
    };

    return (
        <Fragment>
            <div className="app-user-view">
                <Row>
                    <Col xl={12} lg={12} xs={{ order: 0 }} md={{ order: 1, size: 12 }}>
                        <Tabs
                            active={active}
                            id={id}
                            companyDetails={companyDetails}
                            questionAnswers={questionAnswers}
                            toggleTab={toggleTab}
                        />

                        <TabContents
                            id={id}
                            companyDetails={companyDetails}
                            questionAnswers={questionAnswers}
                            toggleTab={toggleTab}
                            active={active}
                        />
                    </Col>
                </Row>
            </div>
        </Fragment>
    )
}

export default AssessmentReportFront
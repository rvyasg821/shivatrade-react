// ** React Imports
import { Fragment, useRef } from 'react';

// ** Reactstrap Imports
import { TabPane, TabContent } from 'reactstrap';
import AssessmentReportCompanyDetails from './companydetails';
import AssessmentReportPreview from './Preview';


const TabContents = ({
    active,
    id,
    questionAnswers,
    companyDetails
}) => {
    console.log('TabContents ID :', id);

    return (
        <Fragment>
            <TabContent activeTab={active}>
                <TabPane tabId={companyDetails}>
                    <AssessmentReportCompanyDetails  id={id}/>
                </TabPane>

                <TabPane tabId={questionAnswers}>
<AssessmentReportPreview/>
                </TabPane>

            </TabContent>
        </Fragment>
    )
}

export default TabContents;

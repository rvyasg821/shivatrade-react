// ** React Imports
import { Fragment, useRef } from 'react';

import { TabPane, TabContent } from 'reactstrap';
import AssessmentForm from './add/assessmentform';
import AssessmentQuestion from './add/addquestionassessment';

const TabContents = ({
    active,
    addKey,
    editKey,
    id,
    mode
}) => {
    const childFunc = useRef(null);

    return (
        <Fragment>
            <TabContent activeTab={active}>
                <TabPane tabId={addKey}>
                    <AssessmentForm id={id} mode={mode} />
                </TabPane>

                <TabPane tabId={editKey}>
                    <AssessmentQuestion id={id} childFunc={childFunc} />
                </TabPane>

            </TabContent>
        </Fragment>
    )
}

export default TabContents;

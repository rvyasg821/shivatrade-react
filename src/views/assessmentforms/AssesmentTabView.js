import React, { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Col, Row } from 'reactstrap';
import Tabs from './tabs';
import TabContents from './tabContents';
import { useLocation } from "react-router-dom";

const AssesmentTabView = ({ isDisabled, id, mode, openQuestionTab }) => {
    const { t } = useTranslation();
    const { state } = useLocation();

    const addKey = "add-form";
    const editKey = "edit-form";

    const [active, setActive] = useState(addKey);

    useEffect(() => {
        let nextTab = addKey;

        if (state?.goToFirstTabs === true) {
            nextTab = addKey;
        } else if (openQuestionTab === true) {
            nextTab = editKey;
        } else if (mode === "edit") {
            nextTab = addKey;
        } else {
            nextTab = addKey
        }
        setActive(nextTab);
    }, [state, openQuestionTab, mode]);

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
                            toggleTab={toggleTab}
                            addKey={addKey}
                            editKey={editKey}
                            isDisabled={isDisabled}
                            id={id}
                        />

                        <TabContents
                            active={active}
                            toggleTab={toggleTab}
                            addKey={addKey}
                            editKey={editKey}
                            id={id}
                            mode={mode}
                        />
                    </Col>
                </Row>
            </div>
        </Fragment>
    );
};

export default AssesmentTabView
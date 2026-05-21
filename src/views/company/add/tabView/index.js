// ** React Imports
import { Fragment, useEffect, useState } from "react";
import { ArrowLeft } from "react-feather";

// ** Reactstrap Imports
import { Button, Col, Row } from 'reactstrap'

import Tabs from "./tabs";
import TabContents from "./tabContents";
import {
    appsRoot,

} from "@constant/defaultValues";
// ** Styles
import '@styles/react/apps/app-users.scss';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CompanyEditTabView = () => {

    const EditKey = "edit";
    const AddressKey = "Address";
    const navigate = useNavigate();
    const { t } = useTranslation();

    // ** States
    const [active, setActive] = useState(EditKey)

    const toggleTab = (tab) => {
        if (active !== tab) {
            setActive(tab)
        }
    }

    return (
        <Fragment>
            <div className="app-user-view">
                <Row>
                     <Col xl={12} lg={12} xs={{ order: 0 }} md={{ order: 1, size: 12 }}>
                        <div className="d-flex justify-content-between align-items-center mb-0">
                      
                   
                        <Tabs
                            active={active}
                            EditKey={EditKey}

                            AddressKey={AddressKey}

                            toggleTab={toggleTab}
                        />
                         <Button
                                type="button"
                                color="primary"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft size={17} />
                            </Button>
                        </div>

                        <TabContents
                            active={active}
                            EditKey={EditKey}

                            AddressKey={AddressKey}

                        />
                    </Col>

                </Row>
            </div>
        </Fragment>
    )
}

export default CompanyEditTabView

import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, TabContent, TabPane } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import OverviewTab from "./OverviewTab";
import PublicLinkTab from "./PublicLinkTab";

const QuotationTabView = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("overview");
  const toggleTab = (tab) => {
    if (active !== tab) setActive(tab);
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-0">
        <Tabs active={active} toggleTab={toggleTab} />
        <Button
          type="button"
          color="primary"
          onClick={() => navigate(`${appsRoot}/quotations`)}
        >
          <ArrowLeft size={17} />
        </Button>
      </div>
      <Card>
        <CardBody>
          <TabContent activeTab={active}>
            <TabPane tabId="overview">
              <OverviewTab />
            </TabPane>
            <TabPane tabId="public-link">
              <PublicLinkTab />
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default QuotationTabView;

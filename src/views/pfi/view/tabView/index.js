import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, TabContent, TabPane } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import OverviewTab from "./OverviewTab";
import PosTab from "./PosTab";
import PublicLinkTab from "./PublicLinkTab";

const PfiTabView = () => {
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
          onClick={() => navigate(-1)}
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
            <TabPane tabId="pos">
              {active === "pos" && <PosTab />}
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

export default PfiTabView;

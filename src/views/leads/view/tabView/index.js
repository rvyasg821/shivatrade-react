import { Fragment, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, TabContent, TabPane } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import ActivityTab from "../../ActivityTab";
import QuotationsTab from "./QuotationsTab";
import DetailsTab from "./DetailsTab";

const LeadTabView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [active, setActive] = useState("activity");
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
            <TabPane tabId="activity">
              <ActivityTab leadId={id} />
            </TabPane>
            <TabPane tabId="quotations">
              <QuotationsTab />
            </TabPane>
            <TabPane tabId="details">
              <DetailsTab />
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default LeadTabView;

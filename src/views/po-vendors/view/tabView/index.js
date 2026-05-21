import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import OverviewTab from "./OverviewTab";
import TrackingTab from "./TrackingTab";

const PoVendorTabView = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("overview");

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-0">
        <Tabs active={active} toggleTab={setActive} />
        <Button
          type="button"
          color="primary"
          onClick={() => navigate(`${appsRoot}/po-vendors`)}
        >
          <ArrowLeft size={17} />
        </Button>
      </div>
      {active === "overview" && <OverviewTab />}
      {active === "tracking" && <TrackingTab />}
    </Fragment>
  );
};

export default PoVendorTabView;

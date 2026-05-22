import { Fragment, useState } from "react";

import Tabs from "./tabs";
import OverviewTab from "./OverviewTab";
import TrackingTab from "./TrackingTab";

const PoVendorTabView = () => {
  const [active, setActive] = useState("overview");

  return (
    <Fragment>
      <Tabs active={active} toggleTab={setActive} />
      {active === "overview" && <OverviewTab />}
      {active === "tracking" && <TrackingTab />}
    </Fragment>
  );
};

export default PoVendorTabView;

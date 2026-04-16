// ** React Imports
import { Fragment, useEffect, useState } from "react";

// ** Reactstrap Imports
import { Col, Row } from "reactstrap";

import Tabs from "./tabs";
import TabContents from "./tabContents";

// ** Styles
import "@styles/react/apps/app-users.scss";

const CompanyTabView = () => {
  // ** Tab Keys
  const accountKey = "account";
  const subscriptionKey = "subscription";
  const paymentKey = "payment";

  // ** State
  const [active, setActive] = useState(subscriptionKey);

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
              subscriptionKey={subscriptionKey}
              paymentKey={paymentKey}
              toggleTab={toggleTab}
            />

            <TabContents
              active={active}
              subscriptionKey={subscriptionKey}
              paymentKey={paymentKey}
              toggleTab={toggleTab}
            />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default CompanyTabView;

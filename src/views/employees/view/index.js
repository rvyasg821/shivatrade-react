// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { cleanEmployeeMessage } from "@src/views/employees/store";

// ** Reactstrap Imports
import { Col, Row } from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import EmployeeInfoCard from "./EmployeeInfoCard";
import EmployeeTabView from "./tabView/";

// ** Styles
import "@styles/react/apps/app-users.scss";

const ViewEmployee = () => {
  const dispatch = useDispatch();
  const store = useSelector((state) => state.employee);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage());
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
            <EmployeeInfoCard />
          </Col>
          <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
            <EmployeeTabView />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ViewEmployee;

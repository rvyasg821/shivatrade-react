// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { cleanUserMessage } from "../store";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Components
import UserTabs from "./UserTabs";

const UserEdit = (props) => {
  const { redirectPath } = props;
  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);

  // Notification and cleanup logic moved to UserForm
  useEffect(() => {
    // Only cleanup message on mount/unmount if needed, but UserForm handles it
  }, []);

  return (
    <Fragment>
      <UserTabs redirectPath={redirectPath} />
    </Fragment>
  )
}

export default UserEdit;

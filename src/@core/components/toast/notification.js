// ** Custom Components
import Avatar from "@components/avatar"

// ** Third Party Components
import toast from "react-hot-toast"
import { Coffee, X } from "react-feather"

const Notification = (name = "Success", msg = "", type = "success") => {
  return toast(
    (t) => (
      <div className="w-100 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <Avatar
            size="sm"
            color={type}
            className="me-1"
            icon={(<Coffee size={12} />)}
          />
          <div>
            <p className="mb-0">{name}</p>
            <small className="text-break">{msg}</small>
          </div>
        </div>
        <X size="14" onClick={() => toast.dismiss(t.id)} />
      </div>
    ),
    {
      style: {
        minWidth: "300px"
      }
    }
  )
}

export default Notification

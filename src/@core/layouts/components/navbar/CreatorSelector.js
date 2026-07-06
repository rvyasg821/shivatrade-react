// ** React Imports
import { useSelector, useDispatch } from "react-redux"

// ** Reactstrap Imports
import {
  UncontrolledDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
} from "reactstrap"

// ** Icons
import { User, Users, Check } from "react-feather"

// ** Store
import { setSelectedCreator } from "@src/redux/creatorContext"

// Only Company Admin & Location Admin see this. Backend enforces scope
// regardless, so this is purely a convenience switch.
const DROPDOWN_ROLES = ["Company Admin", "Location Admin"]

const CreatorSelector = ({ className = "" }) => {
  const dispatch = useDispatch()
  const authStore = useSelector((state) => state.auth)
  const creatorCtx = useSelector((state) => state.creatorContext)

  const authUserItem = authStore?.authUserItem
  const roleName = authUserItem?.role?.name || ""
  const {
    enabled,
    roster = [],
    selectedCreator,
    selectedCreatorLabel,
    initialized,
  } = creatorCtx || {}

  if (!initialized || !enabled || !DROPDOWN_ROLES.includes(roleName)) {
    return null
  }

  const pick = (value, label) => (e) => {
    e.preventDefault()
    dispatch(setSelectedCreator({ value, label }))
  }

  return (
    <UncontrolledDropdown
      href="/"
      tag="li"
      className={`dropdown-language nav-item ${className}`.trim()}
    >
      <DropdownToggle
        href="/"
        tag="a"
        className="nav-link"
        onClick={(e) => e.preventDefault()}
      >
        <User size={18} className="me-50" />
        <span className="selected-language">
          {selectedCreatorLabel || "All"}
        </span>
      </DropdownToggle>
      <DropdownMenu className="mt-0" end>
        <DropdownItem href="/" tag="a" onClick={pick("all", "All")}>
          {selectedCreator === "all" ? (
            <Check size={14} />
          ) : (
            <Users size={14} />
          )}
          <span className="ms-1">All</span>
        </DropdownItem>
        <DropdownItem href="/" tag="a" onClick={pick("me", "You")}>
          {selectedCreator === "me" ? (
            <Check size={14} />
          ) : (
            <User size={14} />
          )}
          <span className="ms-1">You</span>
        </DropdownItem>
        {roster.length > 0 && <DropdownItem divider />}
        {roster.length > 0 && (
          <DropdownItem header>All Emp + Users</DropdownItem>
        )}
        {roster.map((u) => (
          <DropdownItem
            key={u._id}
            href="/"
            tag="a"
            onClick={pick(u._id, u.name)}
          >
            {u._id === selectedCreator ? (
              <Check size={14} />
            ) : (
              <User size={14} />
            )}
            <span className="ms-1">{u.name}</span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </UncontrolledDropdown>
  )
}

export default CreatorSelector

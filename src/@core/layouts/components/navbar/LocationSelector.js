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
import { MapPin, Check } from "react-feather"

// ** Store
import { setSelectedLocation } from "@src/redux/locationContext"

const LocationSelector = ({ className = '' }) => {
  const dispatch = useDispatch()
  const authStore = useSelector((state) => state.auth)
  const locationCtx = useSelector((state) => state.locationContext)

  const authUserItem = authStore?.authUserItem
  const role = authUserItem?.role
  const roleName = role?.name || ""
  const { selectedLocationId, selectedLocationName, companyLocations, initialized } = locationCtx

  // System-level users have no location: Super Admin, Agent, and any custom role with no companyId
  const isSystemLevel =
    roleName === "Super Admin" ||
    roleName === "Admin" ||
    roleName === "Agent" ||
    role?.category === 'admin' ||
    (role?.category === 'custom' && !role?.companyId)

  if (isSystemLevel) {
    return null
  }

  // Not yet initialized
  if (!initialized) {
    return null
  }

  // Company Admin or Location Admin with multiple locations: interactive dropdown
  const isLocationAdminMulti = roleName === "Location Admin" && companyLocations.length > 1
  if (roleName === "Company Admin" || isLocationAdminMulti) {
    return (
      <UncontrolledDropdown href='/' tag='li' className={`dropdown-language nav-item ${className}`.trim()}>
        <DropdownToggle href='/' tag='a' className='nav-link' onClick={e => e.preventDefault()}>
          <MapPin size={18} className='me-50' />
          <span className='selected-language'>{selectedLocationName || "Select Location"}</span>
        </DropdownToggle>
        <DropdownMenu className='mt-0' end>
          {companyLocations.map((loc) => (
            <DropdownItem
              key={loc._id}
              href='/'
              tag='a'
              onClick={(e) => {
                e.preventDefault()
                dispatch(
                  setSelectedLocation({
                    id: loc._id,
                    name: loc.location_name,
                  })
                )
              }}
            >
              {loc._id === selectedLocationId ? <Check size={14} /> : <MapPin size={14} />}
              <span className='ms-1'>{loc.location_name}</span>
            </DropdownItem>
          ))}
          {companyLocations.length === 0 && (
            <DropdownItem disabled>No locations available</DropdownItem>
          )}
        </DropdownMenu>
      </UncontrolledDropdown>
    )
  }

  // Location Admin / Employee: read-only label (same styling as dropdown toggle)
  if (selectedLocationName) {
    return (
      <UncontrolledDropdown href='/' tag='li' className={`dropdown-language nav-item ${className}`.trim()}>
        <DropdownToggle
          href='/'
          tag='a'
          className='nav-link'
          onClick={e => e.preventDefault()}
          style={{ cursor: 'default' }}
          caret={false}
        >
          <MapPin size={18} className='me-50' />
          <span className='selected-language'>{selectedLocationName}</span>
        </DropdownToggle>
      </UncontrolledDropdown>
    )
  }

  return null
}

export default LocationSelector

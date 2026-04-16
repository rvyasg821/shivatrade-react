// ** React Imports
import { Fragment } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// ** Reactstrap Imports
import { NavItem, NavLink, Badge, Button } from 'reactstrap'

// ** Custom Components
import NavbarUser from './NavbarUser'

// ** Third Party Components
import * as Icon from 'react-feather'
import { ArrowLeft } from 'react-feather'

import { exitImpersonation, exitEmployeeImpersonation } from '@src/views/auth/store'

const ThemeNavbar = (props) => {
  // ** Props
  const { skin, setSkin, setMenuVisibility } = props
  const dispatch = useDispatch()

  const authStore = useSelector((state) => state.auth)

  // Super Admin -> Company Admin impersonation
  const isImpersonating = authStore?.authUserItem?.isImpersonating ||
    !!localStorage.getItem("sa_accessToken")
  const companyName = authStore?.authUserItem?.impersonatingCompanyName ||
    localStorage.getItem("sa_companyName") || ""
  const userName = authStore?.authUserItem?.name || "Company Admin"

  // Company/Location Admin -> Employee impersonation
  const isImpersonatingEmployee = authStore?.authUserItem?.isImpersonatingEmployee ||
    !!localStorage.getItem("admin_accessToken")
  const employeeName = authStore?.authUserItem?.impersonatingEmployeeName ||
    localStorage.getItem("admin_employeeName") || ""

  const handleExitImpersonation = () => {
    dispatch(exitImpersonation())
    window.location.href = "/apps/company"
  }

  const handleExitEmployeeImpersonation = () => {
    dispatch(exitEmployeeImpersonation())
    window.location.href = "/apps/employees"
  }

  return (
    <Fragment>
      <div className='bookmark-wrapper d-flex align-items-center'>
        <ul className='navbar-nav d-xl-none'>
          <NavItem className='mobile-menu me-auto'>
            <NavLink className='nav-menu-main menu-toggle hidden-xs is-active' onClick={() => setMenuVisibility(true)}>
              <Icon.Menu className='ficon' />
            </NavLink>
          </NavItem>
        </ul>

        {isImpersonating && !isImpersonatingEmployee && (
          <div className='d-flex align-items-center ms-1 impersonation-banner'>
            <Badge className='me-75' style={{ fontSize: '0.85rem', padding: '0.45em 0.8em', backgroundColor: '#ff9f43', color: '#fff' }}>
              Viewing as: {userName}{companyName ? ` — ${companyName}` : ''}
            </Badge>
            <button
              type='button'
              className='btn-exit-impersonation d-flex align-items-center gap-50'
              onClick={handleExitImpersonation}
            >
              <ArrowLeft size={14} />
              <span>Back to Super Admin</span>
            </button>
          </div>
        )}

        {isImpersonatingEmployee && (
          <div className='d-flex align-items-center ms-1 impersonation-banner'>
            <Badge className='me-75' style={{ fontSize: '0.85rem', padding: '0.45em 0.8em', backgroundColor: '#00cfe8', color: '#fff' }}>
              Viewing as: {employeeName || authStore?.authUserItem?.name}
            </Badge>
            <button
              type='button'
              className='btn-exit-impersonation d-flex align-items-center gap-50'
              onClick={handleExitEmployeeImpersonation}
            >
              <ArrowLeft size={14} />
              <span>Back to Admin</span>
            </button>
          </div>
        )}
      </div>

      <NavbarUser skin={skin} setSkin={setSkin} />
    </Fragment>
  )
}

export default ThemeNavbar

import IntlDropdown from './IntlDropdown'
import LocationSelector from './LocationSelector'
import UserDropdown from './UserDropdown'

// import NavbarSearch from './NavbarSearch'
// import NotificationDropdown from './NotificationDropdown'
import WidgetVisibilityDropdown from '../../../../views/dashboard/WidgetSettingsDropdown.js'
// ** Third Party Components
import { Sun, Moon } from 'react-feather'

// ** Reactstrap Imports
import { NavItem, NavLink } from 'reactstrap'
import { useLocation } from 'react-router-dom'

const NavbarUser = props => {
  // ** Props
  const { skin, setSkin } = props
  const location = useLocation();
  const isDashboard = location.pathname === '/apps/dashboard';

  // ** Function to toggle Theme (Light/Dark)
  const ThemeToggler = () => {
    if (skin === 'dark') {
      return <Sun className='ficon' onClick={() => setSkin('light')} />
    } else {
      return <Moon className='ficon' onClick={() => setSkin('dark')} />
    }
  }

  return (
    <ul className='nav navbar-nav align-items-center ms-auto'>
      <LocationSelector className='me-1' />
      <IntlDropdown />
      <NavItem className='d-none d-lg-block'>
        <NavLink className='nav-link-style'>
          <ThemeToggler />
        </NavLink>
      </NavItem>
      {/* <NavbarSearch /> */}
      {/* <NotificationDropdown /> */}
      <UserDropdown />

      {isDashboard &&
        <WidgetVisibilityDropdown
          title="Hidden Widgets"
          caret
          className="mx-2"
        />}

    </ul>
  )
}
export default NavbarUser

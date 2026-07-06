// import IntlDropdown from './IntlDropdown';
import LocationSelector from './LocationSelector';
import CreatorSelector from './CreatorSelector';
import UserDropdown from './UserDropdown';

// ** Third Party Components
import { Sun, Moon } from 'react-feather';

// ** Reactstrap Imports
import { NavItem, NavLink } from 'reactstrap';
import { useLocation } from 'react-router-dom';

const NavbarUser = props => {
  // ** Props
  const { skin, setSkin } = props;
  const location = useLocation();
  const isDashboard = location.pathname === '/apps/dashboard';

  // ** Function to toggle Theme (Light/Dark)
  const ThemeToggler = () => {
    if (skin === 'dark') {
      return (<Sun className='ficon' onClick={() => setSkin('light')} />)
    } else {
      return (<Moon className='ficon' onClick={() => setSkin('dark')} />)
    }
  }

  return (
    <ul className='nav navbar-nav align-items-center ms-auto'>
      <LocationSelector className='me-1' />
      <CreatorSelector className='me-1' />
      {/* <IntlDropdown /> */}
      <NavItem className='d-none d-lg-block'>
        <NavLink className='nav-link-style'>
          <ThemeToggler />
        </NavLink>
      </NavItem>

      <UserDropdown />
    </ul>
  )
}
export default NavbarUser

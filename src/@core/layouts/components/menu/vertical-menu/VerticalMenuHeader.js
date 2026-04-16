// ** React Imports
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

// ** Icons Imports
import { Disc, X, Circle } from 'react-feather'

// ** Config
import themeConfig from '@configs/themeConfig'
import logoImage from '@src/assets/images/logo/sidebar-logo.png'
import smallImage from '@src/assets/images/icons/small-logo.png'
import closeToggle from '@src/assets/images/icons/toggle-open.png'
import openToggle from '@src/assets/images/icons/toggle-close.png'

// ** Utils
import { getUserData, getHomeRouteForLoggedInUser } from '@utils'

const VerticalMenuHeader = props => {
  // ** Props
  const { menuCollapsed, setMenuCollapsed, setMenuVisibility, setGroupOpen, menuHover } = props

  // ** Vars
  const user = getUserData()
  // ** Reset open group
  useEffect(() => {
    if (!menuHover && menuCollapsed) setGroupOpen([])
  }, [menuHover, menuCollapsed])

  // ** Menu toggler component
  const Toggler = () => {
    if (!menuCollapsed) {
      return (
        <img
          src={openToggle}
          alt='Collapse Menu'
          data-tour='toggle-icon'
          className='text-primary toggle-icon d-none d-xl-block'
          style={{ width: 20, height: 20, cursor: 'pointer' }}
          onClick={() => setMenuCollapsed(true)}
        />
      )
    } else {
      return (
        <img
          src={closeToggle}
          alt='Collapse Menu'
          data-tour='toggle-icon'
          className='text-primary toggle-icon d-none d-xl-block'
          style={{ width: 20, height: 20, cursor: 'pointer' }}
          onClick={() => setMenuCollapsed(false)}
        />
      )
    }
  }

  return (
    <div className='navbar-header' style={{ background: "#161D27" }}>
      <ul className='nav navbar-nav flex-row'>
        <li className='nav-item me-auto'>
          <NavLink to={user ? getHomeRouteForLoggedInUser(user) : '/'} className='navbar-brand'>
            <span className='brand-logo'>
              <img src={logoImage} alt='logo' />
            </span>
            <span className='small-logo'>
              <img src={smallImage} alt='logo' />
            </span>
          </NavLink>
        </li>
        <li className='nav-item nav-toggle'>
          <div className='nav-link modern-nav-toggle cursor-pointer'>
            <Toggler />
          </div>
        </li>
      </ul>
    </div>
  )
}

export default VerticalMenuHeader

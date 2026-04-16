// ** React Imports
import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

// ** Store & Actions
import { useSelector, useDispatch } from 'react-redux'
import { handleMenuCollapsed, handleContentWidth, handleMenuHidden } from '@store/layout'

// ** Third Party Components
import classnames from 'classnames'
import { ArrowUp } from 'react-feather'

// ** Reactstrap Imports
import { Navbar, Button } from 'reactstrap'

// ** Configs
import themeConfig from '@configs/themeConfig'

// ** Custom Components
import Customizer from '@components/customizer'
import ScrollToTop from '@components/scrolltop'
import FooterComponent from './components/footer'
import NavbarComponent from './components/navbar'
import SidebarComponent from './components/menu/vertical-menu'

// ** Custom Hooks
import { useRTL } from '@hooks/useRTL'
import { useSkin } from '@hooks/useSkin'
import { useLayout } from '@hooks/useLayout'
import { useNavbarType } from '@hooks/useNavbarType'
import { useFooterType } from '@hooks/useFooterType'
import { useNavbarColor } from '@hooks/useNavbarColor'
import { useRouterTransition } from '@hooks/useRouterTransition'

// ** Styles
import '@styles/base/core/menu/menu-types/vertical-menu.scss'
import '@styles/base/core/menu/menu-types/vertical-overlay-menu.scss'

const VerticalLayout = (props) => {
  // ** Props
  const { menu, navbar, footer, children, menuData } = props

  // ** Hooks
  const [isRtl, setIsRtl] = useRTL()
  const { skin, setSkin } = useSkin()
  const { navbarType, setNavbarType } = useNavbarType()
  const { footerType, setFooterType } = useFooterType()
  const { navbarColor, setNavbarColor } = useNavbarColor()
  const { layout, setLayout, setLastLayout } = useLayout()
  const { transition, setTransition } = useRouterTransition()

  // ** States
  const [isMounted, setIsMounted] = useState(false)
  const [menuVisibility, setMenuVisibility] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // ** Vars
  const dispatch = useDispatch()
  const layoutStore = useSelector(state => state.layout)
  const authStore = useSelector(state => state.auth) // auth state
  const user = authStore?.authUserItem || {}
  const userPermissions = user?.role?.permissions || {}
  const isSystemAdmin = user?.role?.name === "Admin" && user?.role?.type === "system"

  // ** Filter menuData based on permissions
  const filteredMenuData = useMemo(() => {
    const filterMenu = (items) =>
      items
        .filter(item => {
          if (!item.permissionId) return true
          if (isSystemAdmin) return true
          const perm = userPermissions[item.permissionId]
          return perm ? perm.can_all === true || perm.can_read === true : false
        })
        .map(item => item.children ? { ...item, children: filterMenu(item.children) } : item)
        .filter(Boolean)

    return filterMenu(menuData || [])
  }, [menuData, userPermissions, isSystemAdmin])

  // ** Update Window Width
  const handleWindowWidth = () => setWindowWidth(window.innerWidth)

  // ** Vars
  const location = useLocation()
  const isHidden = layoutStore.menuHidden
  const contentWidth = layoutStore.contentWidth
  const menuCollapsed = layoutStore.menuCollapsed

  // ** Toggles Menu Collapsed
  const setMenuCollapsed = val => dispatch(handleMenuCollapsed(val))
  const setContentWidth = val => dispatch(handleContentWidth(val))
  const setIsHidden = val => dispatch(handleMenuHidden(val))

  // ** Detect route change to hide menu on mobile
  useEffect(() => {
    if (menuVisibility && windowWidth < 1200) setMenuVisibility(false)
  }, [location])

  // ** Window resize listener
  useEffect(() => {
    window.addEventListener('resize', handleWindowWidth)
    return () => window.removeEventListener('resize', handleWindowWidth)
  }, [])

  // ** Component did mount
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // ** Classes
  const footerClasses = { static: 'footer-static', sticky: 'footer-fixed', hidden: 'footer-hidden' }
  const navbarWrapperClasses = { floating: 'navbar-floating', sticky: 'navbar-sticky', static: 'navbar-static', hidden: 'navbar-hidden' }
  const navbarClasses = { floating: contentWidth === 'boxed' ? 'floating-nav container-xxl' : 'floating-nav', sticky: 'fixed-top', static: 'navbar-static-top', hidden: 'd-none' }
  const bgColorCondition = navbarColor !== '' && navbarColor !== 'light' && navbarColor !== 'white'

  if (!isMounted) return null

  return (
    <div
      className={classnames(
        `wrapper vertical-layout ${navbarWrapperClasses[navbarType] || 'navbar-floating'} ${footerClasses[footerType] || 'footer-static'}`,
        {
          'vertical-menu-modern': windowWidth >= 1200,
          'menu-collapsed': menuCollapsed && windowWidth >= 1200,
          'menu-expanded': !menuCollapsed && windowWidth > 1200,
          'vertical-overlay-menu': windowWidth < 1200,
          'menu-hide': !menuVisibility && windowWidth < 1200,
          'menu-open': menuVisibility && windowWidth < 1200
        }
      )}
      {...(isHidden ? { 'data-col': '1-column' } : {})}
    >
      {!isHidden && (
        <SidebarComponent
          skin={skin}
          menu={menu}
          menuData={filteredMenuData}
          menuCollapsed={menuCollapsed}
          menuVisibility={menuVisibility}
          setMenuCollapsed={setMenuCollapsed}
          setMenuVisibility={setMenuVisibility}
        />
      )}

      <Navbar
        expand="lg"
        container={false}
        light={skin !== 'dark'}
        dark={skin === 'dark' || bgColorCondition}
        color={bgColorCondition ? navbarColor : undefined}
        className={classnames(`header-navbar navbar align-items-center ${navbarClasses[navbarType] || 'floating-nav'} navbar-shadow`)}
      >
        <div className="navbar-container d-flex content">
          {navbar ? navbar({ skin, setSkin, setMenuVisibility }) : <NavbarComponent setMenuVisibility={setMenuVisibility} skin={skin} setSkin={setSkin} />}
        </div>
      </Navbar>

      {children}

      {/* Overlay */}
      <div className={classnames('sidenav-overlay', { show: menuVisibility })} onClick={() => setMenuVisibility(false)}></div>

      {/* Footer */}
      <footer className={classnames(`footer footer-light ${footerClasses[footerType] || 'footer-static'}`, { 'd-none': footerType === 'hidden' })}>
        {footer ? footer : <FooterComponent footerType={footerType} footerClasses={footerClasses} />}
      </footer>

      {/* Customizer */}
      {themeConfig.layout.customizer && (
        <Customizer
          skin={skin}
          isRtl={isRtl}
          layout={layout}
          setSkin={setSkin}
          setIsRtl={setIsRtl}
          isHidden={isHidden}
          setLayout={setLayout}
          footerType={footerType}
          navbarType={navbarType}
          transition={transition}
          setIsHidden={setIsHidden}
          themeConfig={themeConfig}
          navbarColor={navbarColor}
          contentWidth={contentWidth}
          setTransition={setTransition}
          setFooterType={setFooterType}
          setNavbarType={setNavbarType}
          setLastLayout={setLastLayout}
          menuCollapsed={menuCollapsed}
          setNavbarColor={setNavbarColor}
          setContentWidth={setContentWidth}
          setMenuCollapsed={setMenuCollapsed}
        />
      )}

      {/* Scroll To Top */}
      {themeConfig.layout.scrollTop && (
        <div className="scroll-to-top">
          <ScrollToTop showOffset={300} className="scroll-top d-block">
            <Button className="btn-icon icon-upside" color="primary">
              <ArrowUp size={14} />
            </Button>
          </ScrollToTop>
        </div>
      )}
    </div>
  )
}

export default VerticalLayout

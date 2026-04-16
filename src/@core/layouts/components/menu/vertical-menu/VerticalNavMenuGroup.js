// ** React Imports
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

// ** Third Party Components
import classnames from 'classnames'
import { useTranslation } from 'react-i18next'

// ** Reactstrap Imports
import { Collapse, Badge } from 'reactstrap'

// ** Vertical Menu Items Component
import VerticalNavMenuItems from './VerticalNavMenuItems'

// ** Utils
import { hasActiveChild, removeChildren } from '@layouts/utils'

const VerticalNavMenuGroup = ({
  item,
  groupOpen,
  menuHover,
  activeItem,
  parentItem,
  groupActive,
  setGroupOpen,
  menuCollapsed,
  setGroupActive,
  currentActiveGroup,
  setCurrentActiveGroup,
  ...rest
}) => {
  // ** Hooks
  const { t } = useTranslation()
  const location = useLocation()
  // ** Current Val
  const currentURL = useLocation().pathname

  // ** Ref to the <li> so we can scroll it (and its expanded children) into view
  const liRef = useRef(null)

  // ** Whether this group is currently open (used to drive the scroll-into-view effect)
  const isOpen =
    (groupActive && groupActive.includes(item.id)) ||
    (groupOpen && groupOpen.includes(item.id))

  // ** When this group transitions to open (in the inline accordion / mobile
  //    drawer mode), scroll it into view inside the sidebar's PerfectScrollbar
  //    so newly-revealed children aren't clipped below the viewport. We wait
  //    for the Reactstrap Collapse animation (~350ms) before measuring,
  //    otherwise the children still have height: 0 and the scroll lands wrong.
  //    On desktop ≥1200px the right-side hover flyout takes over and this is
  //    a no-op (CSS handles everything).
  useEffect(() => {
    if (!isOpen || !liRef.current) return
    if (menuCollapsed && !menuHover) return
    if (typeof window !== 'undefined' && window.innerWidth >= 1200) return

    const timer = setTimeout(() => {
      try {
        liRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        })
      } catch {
        try { liRef.current.scrollIntoView() } catch { /* ignore */ }
      }
    }, 360)

    return () => clearTimeout(timer)
  }, [isOpen, menuCollapsed, menuHover])

  // ** Toggle Open Group
  // Sticky-active accordion: only one top-level group expanded at a time.
  // When the user closes a manually-opened group, the active route's group
  // re-expands automatically so the sidebar always reflects "where am I".
  const toggleOpenGroup = (item, parent) => {
    let openGroup = groupOpen
    let activeGroup = groupActive

    // ** Case A: Group was manually opened (in openGroup) and clicked again → close it
    if (openGroup.includes(item.id)) {
      openGroup.splice(openGroup.indexOf(item.id), 1)

      // Close any nested children of this group too
      if (item.children) {
        removeChildren(item.children, openGroup, groupActive)
      }

      // Sticky active: restore the active route's group at the top level so the
      // user isn't left with no expanded context for where they are.
      if (!parent && currentActiveGroup.length > 0) {
        activeGroup = [...currentActiveGroup]
        setGroupActive(activeGroup)
      }
    } else if (activeGroup.includes(item.id) || currentActiveGroup.includes(item.id)) {
      // ** Case B: Group is the active-route's group → toggle it
      if (!activeGroup.includes(item.id) && currentActiveGroup.includes(item.id)) {
        // Opening the active group: also close any other manually-opened groups
        activeGroup.push(item.id)
        openGroup = []
      } else {
        // Closing the active group
        activeGroup.splice(activeGroup.indexOf(item.id), 1)
      }

      setGroupActive([...activeGroup])
    } else if (parent) {
      // ** Case C: Nested group inside a parent → handle within parent only,
      //    don't touch top-level accordion state.
      if (parent.children) {
        removeChildren(parent.children, openGroup, groupActive)
      }

      if (!openGroup.includes(item.id)) {
        openGroup.push(item.id)
      }
    } else {
      // ** Case D: Fresh click on a top-level group that's neither open nor active
      //    Sticky-active accordion: close everything else (manual + active),
      //    open only this one.
      openGroup = []
      activeGroup = []
      setGroupActive([])

      openGroup.push(item.id)
    }
    setGroupOpen([...openGroup])
  }

  // ** On Group Item Click
  const onCollapseClick = (e, item) => {
    toggleOpenGroup(item, parentItem)

    e.preventDefault()
  }

  // ** Checks url & updates active item
  useEffect(() => {
    if (hasActiveChild(item, currentURL)) {
      if (!groupActive.includes(item.id)) groupActive.push(item.id)
    } else {
      const index = groupActive.indexOf(item.id)
      if (index > -1) groupActive.splice(index, 1)
    }
    setGroupActive([...groupActive])
    setCurrentActiveGroup([...groupActive])
    setGroupOpen([])
  }, [location])

  // ** Returns condition to add open class
  const openClassCondition = id => {
    if ((menuCollapsed && menuHover) || menuCollapsed === false) {
      if (groupActive.includes(id) || groupOpen.includes(id)) {
        return true
      }
    } else if (groupActive.includes(id) && menuCollapsed && menuHover === false) {
      return false
    } else {
      return null
    }
  }

  return (
    <li
      ref={liRef}
      className={classnames('nav-item has-sub', {
        open: openClassCondition(item.id),
        'menu-collapsed-open': groupActive.includes(item.id),
        'sidebar-group':
          groupActive.includes(item.id) || groupOpen.includes(item.id) || currentActiveGroup.includes(item.id)
      })}

    >
      <Link className='d-flex align-items-center ' to='/' onClick={e => onCollapseClick(e, item)}>
        {item.icon}
        <span className='menu-title text-truncate '>{t(item.title)}</span>

        {item.badge && item.badgeText ? (
          <Badge className='ms-auto me-1 ' color={item.badge} pill>
            {item.badgeText}
          </Badge>
        ) : null}
      </Link>

      {/* Render Child Recursively Through VerticalNavMenuItems Component */}
      <ul className='menu-content' >
        <Collapse isOpen={(groupActive && groupActive.includes(item.id)) || (groupOpen && groupOpen.includes(item.id))}>
          <VerticalNavMenuItems
          
            {...rest}
            items={item.children}
            groupActive={groupActive}
            setGroupActive={setGroupActive}
            currentActiveGroup={currentActiveGroup}
            setCurrentActiveGroup={setCurrentActiveGroup}
            groupOpen={groupOpen}
            setGroupOpen={setGroupOpen}
            parentItem={item}
            menuCollapsed={menuCollapsed}
            menuHover={menuHover}
            activeItem={activeItem}
          />
        </Collapse>
      </ul>
    </li>
  )
}

export default VerticalNavMenuGroup

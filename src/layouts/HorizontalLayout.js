// ** React Imports
import { Fragment, useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'

// ** Store & Actions
import { useSelector } from "react-redux"

// ** Core Layout Import
// !Do not remove the Layout import
import Layout from '@layouts/HorizontalLayout'

// ** Menu Items Array
import navigation from '@src/navigation/horizontal'

const HorizontalLayout = (props) => {
  // ** Store vars
  const store = useSelector((state) => state.auth)

  // ** States
  const [menuData, setMenuData] = useState(navigation)

  const handleManageMenu = useCallback((item) => {
    const menuItems = [...menuData]
    const permissions = item?.permissions || []
    const bypass = roleBypassType.includes(item?.roleType)

    if (!bypass) {
      menuData.map((menu) => {
        if (menu?.permissionId) {
          const permission = permissions.find((x) => x.module_slug === menu.permissionId)
          if (menu?.children?.length) {
            const rmChInd = []
            let children = [...menu.children]
            menu.children.map((child) => {
              if (child?.permissionId) {
                const chPermission = permissions.find((x) => x.module_slug === child.permissionId) || null
                if (!chPermission?.can_read) {
                  const chInd = children.findIndex((x) => x.permissionId === child.permissionId)
                  if (chInd > -1) { rmChInd.push(chInd) }
                }
              }
            })

            if (rmChInd?.length) {
              children = children.filter((_, index) => !rmChInd.includes(index))
            }

            const mnInd = menuItems.findIndex((x) => x.permissionId === menu.permissionId)
            if (children?.length === 0) {
              if (mnInd > -1) { menuItems.splice(mnInd, 1) }
            } else if (mnInd > -1) {
              menuItems[mnInd] = {
                ...menuItems[mnInd],
                children
              }
            }
          } else if (!permission?.can_read) {
            const mnInd = menuItems.findIndex((x) => x.permissionId === menu.permissionId)
            if (mnInd > -1) { menuItems.splice(mnInd, 1) }
          }
        }
      })
    }

    setMenuData([...menuItems])
  }, [])

  // ** For ServerSide navigation
  // useEffect(() => {
  // }, [])

  useEffect(() => {
    if (store?.actionFlag === "AUTH_ME_SCS" && store?.userItem) {
      handleManageMenu(store.userItem?.role)
    }
  }, [store.actionFlag])

  return (
    <Fragment>
      <Layout menuData={menuData} {...props}>
        <Outlet />
      </Layout>
    </Fragment>
  )
}

export default HorizontalLayout

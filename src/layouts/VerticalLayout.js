// ** React Imports
import { Fragment, useState, useEffect, useCallback, useContext } from "react";
import { Outlet } from "react-router-dom";

// ** Store & Actions
import { useSelector, useDispatch } from "react-redux";
import { getAuthMe } from '@src/views/auth/store';
import { initLocationContext } from '@src/redux/locationContext';

// ** Core Layout Import
// !Do not remove the Layout import
import Layout from "@layouts/VerticalLayout";

// ** Menu Items Array
import navigation from "@src/navigation/vertical";

// ** Constants
import { roleBypassType } from "@constant/defaultValues";

// ** Context
import { AbilityContext } from '@src/utility/context/Can';

// ** Utils
import { getAccessToken } from '@src/utility/Utils';

// Note: Temporarily disabled menu filtering to avoid React Hooks order error
// The navigation components were causing hooks to be called in different orders
// when menu items were dynamically filtered

const VerticalLayout = (props) => {
  // ** Store vars
  const store = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // ** States
  const [menuData, setMenuData] = useState(navigation);

  // ** Get ability context
  const ability = useContext(AbilityContext);

  // ** 1. Stabilize Role Permissions for dependencies
  const rolePermissionsStr = JSON.stringify(store?.authUserItem?.role?.permissions || {});
  const roleName = store?.authUserItem?.role?.name || "";
  const roleType = store?.authUserItem?.role?.type || "";

  const handleManageMenu = useCallback((role = null, user = null) => {
    // 1. Filter Menu Data based on companyOnly / adminLevel flags

    // Full admins (named system roles + Agent): get manage:all CASL + no companyOnly items
    const isFullAdmin =
      role?.name === 'Super Admin' ||
      role?.name === 'Admin' ||
      role?.name === 'Agent' ||
      role?.category === 'admin';

    // System-level: full admins + custom roles with no companyId (platform-level)
    // Used for: hiding companyOnly items and showing adminOnly items
    const isSystemAdmin =
      isFullAdmin ||
      (role?.category === 'custom' && !role?.companyId);

    const isEmployee = role?.name === 'Employee';

    // selfServiceOnly: visible to Employee + company-level custom roles only
    // Hidden from Company Admin, Location Admin, and system admins
    const canSeeSelfService = isEmployee || (role?.category === 'custom' && !!role?.companyId);

    const filteredMenu = navigation.map(item => {
      const newItem = { ...item };
      // Hide adminLevel items from Employee
      if (newItem.adminLevel && isEmployee) return null;
      // Hide employeeOnly items from non-employees (admins)
      if (newItem.employeeOnly && !isEmployee) return null;
      // Hide selfServiceOnly items from company/location admins
      if (newItem.selfServiceOnly && !canSeeSelfService) return null;
      if (newItem.children) {
        newItem.children = newItem.children.filter(child => {
          if (child.companyOnly && isSystemAdmin) return false;
          if (child.adminLevel && isEmployee) return false;
          if (child.employeeOnly && !isEmployee) return false;
          if (child.selfServiceOnly && !canSeeSelfService) return false;
          return true;
        });
      }
      if (newItem.companyOnly && isSystemAdmin) return null;
      return newItem;
    }).filter(item => item !== null);

    setMenuData(prev => {
      if (JSON.stringify(prev) === JSON.stringify(filteredMenu)) return prev;
      return filteredMenu;
    });

    // 2. Update CASL ability based on user permissions
    if (role?.permissions && ability) {
      const permissions = role.permissions;
      const rules = [];
      rules.push({ action: 'read', subject: 'dashboard' });
      rules.push({ action: 'manage', subject: 'Auth' });

      if (isFullAdmin) {
        // Full system admins bypass per-permission checks
        rules.push({ action: 'manage', subject: 'all' });
      } else {
        Object.keys(permissions).forEach(resource => {
          const permission = permissions[resource];
          if (permission?.can_read || permission?.can_view) {
            rules.push({ action: 'read', subject: resource });
          }
          if (permission?.can_add || permission?.can_create) {
            rules.push({ action: 'create', subject: resource });
          }
          if (permission?.can_update || permission?.can_edit) {
            rules.push({ action: 'update', subject: resource });
          }
          if (permission?.can_delete) {
            rules.push({ action: 'delete', subject: resource });
          }
        });
      }

      const currentRulesStr = JSON.stringify(ability.rules);
      const newRulesStr = JSON.stringify(rules);

      if (currentRulesStr !== newRulesStr) {
        ability.update(rules);
      }
    }
  }, [ability]);

  // ** Fetch user data on mount — always refresh to get latest location_id
  useEffect(() => {
    const accessToken = getAccessToken();
    if (accessToken) {
      dispatch(getAuthMe({}));
    }
  }, []); // Run only on mount

  useEffect(() => {
    if (store?.authUserItem) {
      handleManageMenu(store.authUserItem?.role, store.authUserItem);
    }
  }, [rolePermissionsStr, roleName, roleType, handleManageMenu]);

  // Initialize location context ONLY after getAuthMe returns complete user data.
  // The login-response authUserItem has role as a raw UUID (not populated) and may
  // lack location_id — triggering earlier causes the wrong (default) location to be shown.
  useEffect(() => {
    if (store?.actionFlag === "AUTH_ME_SCS" && store?.authUserItem?._id) {
      dispatch(initLocationContext(store.authUserItem));
    }
  }, [store?.actionFlag, dispatch]);

  return (
    <Fragment>
      <Layout menuData={menuData} {...props}>
        <Outlet />
      </Layout>
    </Fragment>
  )
}

export default VerticalLayout;

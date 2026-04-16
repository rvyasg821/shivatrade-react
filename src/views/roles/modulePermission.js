import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from "react-redux"
import { getRole, updateRole, cleanRoleMessage } from './store'
import { startLoading, stopLoading } from "../loadingstore"
import openedIcon from "@src/assets/images/svg/openedPolygon.svg";
import closedIcon from "@src/assets/images/svg/closedpolygon.png";
import {
  Col,
  Row,
  Card,
  CardBody,
  Collapse,
  Table,
  Button,
  Input,
  Alert
} from 'reactstrap'
import Notification from "@components/toast/notification"
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from "react-feather"
import { appsRoot } from "@constant/defaultValues"

const ModulePermission = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const store = useSelector((state) => state.role || {})
  const authStore = useSelector((state) => state.auth || {})
  const [rolePermissions, setRolePermissions] = useState([])
  const [selectedAccordion, setSelectedAccordion] = useState(null)

  const permissionKeys = ["can_all", "can_read", "can_add", "can_update", "can_delete"]

  const handleSetInitialPermission = useCallback((items = {}) => {
    const currentUserPermi = authStore?.authUserItem?.role?.permissions || {};

    // Use the union of current user's modules + target role's modules
    // This ensures modules like location/employee appear even if Super Admin's
    // own role doesn't include them
    const allModuleSlugs = new Set([
      ...Object.keys(currentUserPermi),
      ...Object.keys(items || {}),
    ]);

    const mergedPermi = {};
    allModuleSlugs.forEach((module_slug) => {
      if (module_slug) {
        mergedPermi[module_slug] = {
          ...(currentUserPermi[module_slug] || {}),
          can_all: items?.[module_slug]?.can_all || false,
          can_read: items?.[module_slug]?.can_read || false,
          can_add: items?.[module_slug]?.can_add || false,
          can_update: items?.[module_slug]?.can_update || false,
          can_delete: items?.[module_slug]?.can_delete || false,
        };
      }
    });

    const modules = Object.entries(mergedPermi)
      .filter(([_, value]) => typeof value === "object" && value !== null && !Array.isArray(value))
      .map(([module_slug, rights]) => ({
        module_slug,
        permissions: rights
      }));
    setRolePermissions(modules);
  }, [authStore])

  useLayoutEffect(() => {
    if (id) {
      dispatch(getRole(id))
    }
  }, [id, dispatch])

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanRoleMessage(null))
    }

    if (store?.actionFlag === "ROLE_SCS" && store?.roleItem?._id) {
      handleSetInitialPermission(store.roleItem?.permissions)
    }

    if (store?.success) {
      Notification("Success", String(store.success), "success")
    }
    if (store?.error) {
      let errorMessage = "Something went wrong.";
      if (typeof store.error === "string") errorMessage = store.error;
      else if (store.error?.message) errorMessage = store.error.message;
      if (Array.isArray(store.error?.errors)) {
        errorMessage = store.error.errors.map(e => `${e.property}: ${e.message}`).join(", ");
      }
      Notification("Error", errorMessage, "warning");
    }
  }, [store.actionFlag, store.success, store.error, dispatch, handleSetInitialPermission])

  useEffect(() => {
    if (store?.loading) dispatch(startLoading())
    else dispatch(stopLoading())
  }, [store?.loading, dispatch])

  const handleChangeOneAllPermission = (index, checked) => {
    const permissionsCopy = [...rolePermissions];
    const module = { ...permissionsCopy[index] };
    module.permissions = { ...module.permissions };

    Object.keys(module.permissions).forEach(key => {
      module.permissions[key] = checked;
    });

    permissionsCopy[index] = module;
    setRolePermissions(permissionsCopy);
  };

  const handleChangePermission = (index, checked, key) => {
    const permissionsCopy = [...rolePermissions];
    const module = { ...permissionsCopy[index] };
    module.permissions = { ...module.permissions };

    module.permissions[key] = checked;
    module.permissions.can_all = Object.keys(module.permissions)
      .filter(k => k !== "can_all")
      .every(k => module.permissions[k]);

    permissionsCopy[index] = module;
    setRolePermissions(permissionsCopy);
  };

  const handleSubmit = () => {
    if (!store?.roleItem?._id) return;

    // Send ALL modules explicitly (including all-false ones).
    // Filtering out all-false modules causes them to be absent from the DB,
    // which means unchecking a permission has no effect until the next full save.
    const permissionsObject = rolePermissions.reduce((acc, perm) => {
      acc[perm.module_slug] = { ...perm.permissions };
      return acc;
    }, {});

    // Build payload
    const roleData = {
      name: store?.roleItem?.name || "",
      type: store?.roleItem?.type,
      permissions: permissionsObject
    };

    // 4️⃣ Dispatch update
    dispatch(updateRole({ id: store.roleItem._id, data: roleData }))
      .unwrap()
      .then(() => navigate(`${appsRoot}/roles`))
      .catch((err) => {
      });

  };

  const groupedPermissions = Array.isArray(rolePermissions)
    ? rolePermissions.reduce((acc, item, index) => {
      const group = item.group === item.module_slug ? 'main' : item.group || 'main'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push({ ...item, originalIndex: index })
      return acc
    }, {})
    : {}

  const capitalize = (str = "") => str.charAt(0).toUpperCase() + str.slice(1)

  const toggleAccordion = (index) => {
    setSelectedAccordion(selectedAccordion === index ? null : index)
  }

  // Check if current user is super admin or system user
  // Note: Super Admin role name is 'Admin' in database
  const isSuperAdmin = authStore?.authUserItem?.role?.name === 'Admin' || authStore?.authUserItem?.isSystemUser === true || authStore?.authUserItem?.userType === 'admin';
  const isCompanyAdmin = authStore?.authUserItem?.role?.name === 'Company Admin';

  const navigation = [
    {
      title: t("Root"),
      children: [
        // Company listing is Super Admin only
        ...(isSuperAdmin ? [{ title: "Company" }] : []),
        { title: "Tools" },
      ]
    },
    {
      title: t("Master"),
      children: [
        { title: "User" },
        { title: "Role" },
        { title: "Location" },
        { title: "Employee" },
      ]
    },
    // Subscription group is Super Admin only (Company Admin manages subscription from profile)
    ...(isSuperAdmin ? [{
      title: t("Subscription"),
      children: [
        { title: "Plans" },
        { title: "Subscription" },
        { title: "Payments" },
        { title: "Discount" },
      ]
    }] : []),
    // HRM group — shown for all editors so Super Admin can configure HRM permissions on company roles
    {
      title: t("HRM"),
      children: [
        { title: "Holiday Calendar" },
        { title: "Document" },
        { title: "Contract" },
        { title: "Leave" },
        { title: "Attendance" },
        { title: "Shift" },
        { title: "Compliance" },
      ]
    }
  ];

  return (
    <div className="main-content">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="mb-0">
          {t("Module Permissions")} {store?.roleItem?.name ? ` - ${store.roleItem.name}` : null}
        </h3>
        <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(`${appsRoot}/roles`)}>
          <ArrowLeft size={17} color="white" />
        </Button>
      </div>

      {store?.roleItem?.isDefault && (
        <Alert color="info" className="mb-2">
          <strong>{t("Default Role")}</strong> — {t("This is a system-defined role. You can configure its permissions, but the role name and type cannot be changed.")}
        </Alert>
      )}

      <Card className="global-management main-tutorial global-preview m-0 p-2">
        <CardBody className="assesment-detail mb-0 p-0">

          {navigation.map((navGroup, index) => {
            const groupTitle = navGroup.title;
            const children = navGroup.children || [];
            // Convert children titles → module slugs
            const expectedSlugs = children.length
              ? children.map((c) => c.title.toLowerCase().replace(/\s+/g, "_"))
              : [groupTitle.toLowerCase().replace(/\s+/g, "_")]; // ensure matching
            // Filter modules that belong to this group
            const modulesInGroup = rolePermissions
              .map((mod, idx) => ({ ...mod, originalIndex: idx })) // attach originalIndex
              .filter((mod) => expectedSlugs.includes(mod.module_slug));
            // Skip empty groups
            if (!modulesInGroup.length) return null;
            const isOpen = selectedAccordion === index;
            return (
              <Card key={groupTitle} className={`mb-2 accrodion-permi  ${isOpen ? "accordion-border-left" : ""}`}>
                <button
                  type="button"
                  className="w-100 border-0 d-flex justify-content-between align-items-center permission-accordion"
                  onClick={() => toggleAccordion(index)}
                >
                  <h5 className="mb-0">{groupTitle}</h5>
                  <span className="check-box-permission">
                    <img
                      src={isOpen ? openedIcon : closedIcon}
                      alt={isOpen ? "open" : "close"}
                    />
                  </span>
                </button>
                <Collapse isOpen={isOpen}>
                  <CardBody className="p-0 custome-table">
                    <Table responsive>
                      <thead className='custome-table table' >
                        <tr>
                          <th>{t("Module")}</th>
                          {permissionKeys.map((key) => (
                            <th key={key} className="text-center">
                              {t(key === "can_read" ? "View" : key.replace("can_", "").toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modulesInGroup.map((module) => (
                          <tr key={module.module_slug}>
                            <td className="fw-bolder">
                              {t(
                                module.module_slug
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c) => c.toUpperCase())
                              )}
                            </td>
                            {permissionKeys.map((key) => (
                              <td key={key} className="text-center">
                                <Input
                                  type="checkbox"
                                  checked={module.permissions[key]}
                                  onChange={(e) =>
                                    key === "can_all"
                                      ? handleChangeOneAllPermission(module.originalIndex, e.target.checked)
                                      : handleChangePermission(module.originalIndex, e.target.checked, key)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </CardBody>
                </Collapse>
              </Card>
            );
          })}
          <div className="main-form-btn mt-2">
            <div className="form-btn">
              <Button type="button" color="primary" onClick={handleSubmit}>
                {t("Save")}
              </Button>
            </div>
            <div className="form-btn">
              <Button type="button" color="secondary" onClick={() => navigate(`${appsRoot}/roles`)}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default ModulePermission
// ** Designations & Departments — central management of the per-company
// lookup values used by the Employee/User forms. Backed by the shared
// company-lookup store (getLookups/createLookup/updateLookup/deleteLookup).
//
// Styled to match the other listing pages (Customers / Cities / Leads): a
// main-content header, a card toolbar with search + Add, and the shared
// react-dataTable look. Data is small and lives fully in redux, so pagination
// and sorting run client-side (unlike the server-paginated business lists).
import { Fragment, useState, useEffect, useMemo, useLayoutEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getLookups,
  createLookup,
  updateLookup,
  deleteLookup,
  clearLookupMessages,
} from "@src/views/company-lookups/store";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Card,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  FormFeedback,
  Spinner,
  UncontrolledTooltip,
} from "reactstrap";

// ** Third Party Components
import DataTable from "react-data-table-component";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Constants
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues";

// The two lookup types this page manages. `key` = redux slice field.
const TABS = [
  { type: "designation", key: "designations", label: "Designations", single: "Designation" },
  { type: "department", key: "departments", label: "Departments", single: "Department" },
];

const EmployeeLookups = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const lookupStore = useSelector((state) => state.companyLookup);

  const [activeType, setActiveType] = useState("designation");
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, else the row being renamed
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTab = TABS.find((x) => x.type === activeType);
  const items = lookupStore?.[activeTab.key] || [];

  // Client-side search over the current tab's list.
  const filteredItems = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => (row?.name || "").toLowerCase().includes(q));
  }, [items, searchInput]);

  // Load both lists once.
  useEffect(() => {
    dispatch(getLookups("designation"));
    dispatch(getLookups("department"));
  }, [dispatch]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Search is per-list — drop it when the tab changes so results aren't stale.
  const switchTab = (type) => {
    setActiveType(type);
    setSearchInput("");
  };

  const openAdd = () => {
    setEditing(null);
    setNameValue("");
    setNameError("");
    setModalOpen(true);
  };

  const openRename = (row) => {
    setEditing(row);
    setNameValue(row.name);
    setNameError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setNameValue("");
    setNameError("");
  };

  const handleSave = async () => {
    const name = nameValue.trim();
    if (!name) {
      setNameError(t(`${activeTab.single} name is required`));
      return;
    }
    // Case-insensitive duplicate guard on the client (backend enforces too).
    const clash = items.some(
      (d) => d.name.toLowerCase() === name.toLowerCase() && d._id !== editing?._id
    );
    if (clash) {
      setNameError(t(`This ${activeTab.single.toLowerCase()} already exists`));
      return;
    }

    setSaving(true);
    try {
      const action = editing
        ? updateLookup({ type: activeType, id: editing._id, name })
        : createLookup({ type: activeType, name });
      await dispatch(action).unwrap();
      Notification(
        "Success",
        editing ? t(`${activeTab.single} updated`) : t(`${activeTab.single} added`),
        "success"
      );
      setModalOpen(false);
      setEditing(null);
      setNameValue("");
    } catch (err) {
      Notification("Error", err || t("Operation failed"), "warning");
    } finally {
      setSaving(false);
      dispatch(clearLookupMessages());
    }
  };

  const handleDelete = (row) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t(`"${row.name}" will be removed. Existing employees keep their current value.`),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (res) => {
        if (!res.isConfirmed) return;
        try {
          await dispatch(deleteLookup({ type: activeType, id: row._id })).unwrap();
          Notification("Success", t(`${activeTab.single} deleted`), "success");
        } catch (err) {
          Notification("Error", err || t("Delete failed"), "warning");
        } finally {
          dispatch(clearLookupMessages());
        }
      });
  };

  const columns = [
    {
      name: "#",
      width: "70px",
      cell: (row, index) => <span className="text-muted">{index + 1}</span>,
    },
    {
      name: t(activeTab.single),
      sortable: true,
      selector: (row) => row?.name || "",
      cell: (row) => (
        <span
          className="fw-bold text-primary cursor-pointer text-wrap"
          onClick={() => openRename(row)}
        >
          {row?.name || "-"}
        </span>
      ),
    },
    {
      name: t("Status"),
      width: "140px",
      selector: (row) => (row?.isActive === false ? "Inactive" : "Active"),
      cell: (row) => (
        <Badge color={row?.isActive === false ? "light-warning" : "light-success"}>
          {row?.isActive === false ? t("Inactive") : t("Active")}
        </Badge>
      ),
    },
    {
      name: t("Action"),
      center: true,
      width: "140px",
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <span
            className="me-50 cursor-pointer"
            id={`lookup-edit-${row?._id}`}
            onClick={() => openRename(row)}
          >
            <UncontrolledTooltip placement="top" target={`lookup-edit-${row?._id}`}>
              {t("Rename")}
            </UncontrolledTooltip>
            <Edit size={20} />
          </span>
          <Trash2
            size={20}
            className="cursor-pointer"
            id={`lookup-delete-${row?._id}`}
            onClick={() => handleDelete(row)}
          />
          <UncontrolledTooltip placement="top" target={`lookup-delete-${row?._id}`}>
            {t("Delete")}
          </UncontrolledTooltip>
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content employee-lookups">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Designations & Departments")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Nav pills className="mb-1">
              {TABS.map((tab) => (
                <NavItem key={tab.type}>
                  <NavLink
                    active={activeType === tab.type}
                    onClick={() => switchTab(tab.type)}
                    className={activeType === tab.type ? "" : "text-body"}
                    style={{ cursor: "pointer" }}
                  >
                    {t(tab.label)}
                    <span className="ms-50 badge bg-light-secondary">
                      {(lookupStore?.[tab.key] || []).length}
                    </span>
                  </NavLink>
                </NavItem>
              ))}
            </Nav>

            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-lookup"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t(`Search ${activeTab.label}`)}
                      onChange={(e) => setSearchInput(e?.target?.value)}
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="3" md="3" className="text-end listing-toolbar-actions">
                <Button color="primary" onClick={openAdd}>
                  <PlusCircle size={14} className="me-50" />
                  {t(`Add ${activeTab.single}`)}
                </Button>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="employee-lookups-tables">
                <div className="datatable">
                  <DataTable
                    columns={columns}
                    data={filteredItems}
                    responsive
                    persistTableHead
                    pagination
                    paginationPerPage={defaultPerPageRow}
                    paginationRowsPerPageOptions={perPageRowItems.map((r) =>
                      Number(r.value)
                    )}
                    className="react-dataTable"
                    noDataComponent={
                      <div className="error-message py-2 text-muted">
                        {searchInput
                          ? t("No matches found.")
                          : t(
                              `No ${activeTab.label.toLowerCase()} yet. Click "Add ${activeTab.single}" to create one.`
                            )}
                      </div>
                    }
                  />
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={modalOpen} toggle={closeModal} centered backdrop="static" keyboard={!saving}>
        <ModalHeader toggle={closeModal}>
          {editing ? t(`Rename ${activeTab.single}`) : t(`Add ${activeTab.single}`)}
        </ModalHeader>
        <ModalBody>
          <Label for="lookup-name">{t(`${activeTab.single} Name`)}</Label>
          <Input
            id="lookup-name"
            value={nameValue}
            invalid={!!nameError}
            autoFocus
            placeholder={t(`Enter ${activeTab.single.toLowerCase()} name`)}
            onChange={(e) => {
              setNameValue(e.target.value);
              if (nameError) setNameError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          {nameError && <FormFeedback className="d-block">{nameError}</FormFeedback>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={closeModal} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : editing ? t("Save") : t("Add")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default EmployeeLookups;

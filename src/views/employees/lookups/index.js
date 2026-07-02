// ** Designations & Departments — central management of the per-company
// lookup values used by the Employee/User forms. Backed by the shared
// company-lookup store (getLookups/createLookup/updateLookup/deleteLookup).
import { Fragment, useState, useEffect } from "react";

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
  CardHeader,
  CardTitle,
  Nav,
  NavItem,
  NavLink,
  Table,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  FormFeedback,
  Spinner,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Custom Components
import Notification from "@components/toast/notification";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, else the row being renamed
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTab = TABS.find((x) => x.type === activeType);
  const items = lookupStore?.[activeTab.key] || [];

  // Load both lists once.
  useEffect(() => {
    dispatch(getLookups("designation"));
    dispatch(getLookups("department"));
  }, [dispatch]);

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
        confirmButtonText: t("Yes, delete it"),
        cancelButtonText: t("Cancel"),
        customClass: { confirmButton: "btn btn-danger", cancelButton: "btn btn-outline-secondary ms-1" },
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

  return (
    <Fragment>
      <Row>
        <Col sm="12">
          <Card>
            <CardHeader className="border-bottom">
              <CardTitle tag="h4">{t("Designations & Departments")}</CardTitle>
              <Button color="primary" onClick={openAdd}>
                <PlusCircle size={14} className="me-50" />{t(`Add ${activeTab.single}`)}
              </Button>
            </CardHeader>
            <CardBody className="pt-1">
              <Nav pills className="mb-1">
                {TABS.map((tab) => (
                  <NavItem key={tab.type}>
                    <NavLink
                      active={activeType === tab.type}
                      onClick={() => setActiveType(tab.type)}
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

              <Table responsive bordered className="mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>{t(activeTab.single)}</th>
                    <th style={{ width: "140px" }} className="text-center">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-2">
                        {t(`No ${activeTab.label.toLowerCase()} yet. Click "Add ${activeTab.single}" to create one.`)}
                      </td>
                    </tr>
                  ) : (
                    items.map((row, idx) => (
                      <tr key={row._id}>
                        <td>{idx + 1}</td>
                        <td>{row.name}</td>
                        <td className="text-center">
                          <Button
                            size="sm"
                            color="flat-primary"
                            className="btn-icon"
                            onClick={() => openRename(row)}
                            title={t("Rename")}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            color="flat-danger"
                            className="btn-icon"
                            onClick={() => handleDelete(row)}
                            title={t("Delete")}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>

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

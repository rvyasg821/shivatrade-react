// ** React Imports
import { Fragment, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getContractTemplateList, deleteContractTemplate, cloneContractTemplate, clearContractMessages } from "../store";

// ** Reactstrap Imports
import {
  Col, Row, Card, CardBody, Input, Button, Badge, UncontrolledTooltip,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Select from "react-select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit2, Trash2, PlusCircle, Copy } from "react-feather";

// ** Constant
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const statusColors = {
  draft: "light-secondary",
  active: "light-success",
  archived: "light-dark",
};

const ContractTemplateList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const dispatch = useDispatch();

  const store = useSelector((state) => state.contract);
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["contract"] || {};
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(null);

  const statusOptions = [
    { value: "draft", label: t("Draft") },
    { value: "active", label: t("Active") },
    { value: "archived", label: t("Archived") },
  ];

  const loadData = (page, limit, search, status) => {
    const params = { _limit: limit, _offset: (page - 1) * limit };
    if (search) params._search = search;
    if (status) params._status = status;
    dispatch(getContractTemplateList(params));
  };

  useEffect(() => {
    loadData(1, perPage, "", "");
  }, []);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(clearContractMessages());
  }, [store?.success, store?.error]);

  useEffect(() => {
    if (store?.actionFlag === "CT_DEL_SCS") {
      loadData(currentPage, perPage, searchInput, selectedStatus?.value || "");
    }
    if (store?.actionFlag === "CT_CLN_SCS" && store?.templateItem?._id) {
      navigate(`${appsRoot}/contracts/templates/edit/${store.templateItem._id}`);
    }
  }, [store?.actionFlag]);

  const handleDelete = (id, name) => {
    mySwal.fire({
      title: t("Are you sure?"),
      text: t(`Delete template "${name}"? This action cannot be undone.`),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("Yes, delete it!"),
      cancelButtonText: t("Cancel"),
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteContractTemplate(id));
    });
  };

  const columns = [
    {
      name: t("Name / Description"),
      sortable: true,
      sortField: "name",
      selector: (row) => row.name,
      minWidth: "220px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1 gap-1">
          <div className="d-flex align-items-center gap-1">
            <Link
              to={`${appsRoot}/contracts/templates/edit/${row._id}`}
              className="fw-semibold"
            >
              {row.name}
            </Link>
            {row.is_system && (
              <Badge color="info" pill style={{ fontSize: "0.65rem" }}>{t("System")}</Badge>
            )}
          </div>
          {row.description && (
            <span className="text-muted small text-truncate" style={{ maxWidth: 260 }}>
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "120px",
      cell: (row) => (
        <span className={`doc-badge ${row.status === 'active' ? 'doc-badge-green' : row.status === 'draft' ? 'doc-badge-gray' : 'doc-badge-red'}`}>
          {t(row.status || "—")}
        </span>
      ),
    },
    {
      name: t("Version"),
      width: "90px",
      cell: (row) => <span className="text-muted small">v{row.version}</span>,
    },
    {
      name: t("Signature"),
      width: "110px",
      cell: (row) => (
        <span className={`doc-badge ${row.requires_signature ? 'doc-badge-green' : 'doc-badge-gray'}`}>
          {row.requires_signature ? t("Required") : t("None")}
        </span>
      ),
    },
    {
      name: t("Created"),
      width: "120px",
      cell: (row) => (
        <span className="small text-muted">
          {new Date(row.createdAt).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "90px",
      cell: (row) => (
        <div className="d-flex gap-1">
          <Link
            to={`${appsRoot}/contracts/templates/edit/${row._id}`}
            id={`edit-${row._id}`}
          >
            <Edit2 size={16} className="text-primary" />
          </Link>
          <UncontrolledTooltip target={`edit-${row._id}`}>{t("Edit / View")}</UncontrolledTooltip>

          {canWrite && row.is_system && (
            <>
              <span
                id={`clone-${row._id}`}
                className="cursor-pointer"
                onClick={() => dispatch(cloneContractTemplate(row._id))}
              >
                <Copy size={16} className="text-success" />
              </span>
              <UncontrolledTooltip target={`clone-${row._id}`}>{t("Clone to Customise")}</UncontrolledTooltip>
            </>
          )}

          {canWrite && !row.is_system && (
            <>
              <span
                id={`del-${row._id}`}
                className="cursor-pointer"
                onClick={() => handleDelete(row._id, row.name)}
              >
                <Trash2 size={16} className="text-danger" />
              </span>
              <UncontrolledTooltip target={`del-${row._id}`}>{t("Delete")}</UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row className="mb-2 align-items-center">
            <Col md={3}>
              <h4 className="mb-0">{t("Contract Templates")}</h4>
            </Col>
            <Col md={9} className="d-flex justify-content-end gap-1 flex-wrap align-items-center">
              <div style={{ width: 160 }}>
                <Select
                  classNamePrefix="select"
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(opt) => {
                    setSelectedStatus(opt);
                    setCurrentPage(1);
                    loadData(1, perPage, searchInput, opt?.value || "");
                  }}
                  placeholder={t("All statuses")}
                  isClearable
                />
              </div>
              <Input
                type="search"
                placeholder={t("Search...")}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                  loadData(1, perPage, e.target.value, selectedStatus?.value || "");
                }}
                style={{ width: 200 }}
              />
              {canWrite && (
                <Button color="primary" tag={Link} to={`${appsRoot}/contracts/templates/add`}>
                  <PlusCircle size={14} className="me-1" />
                  {t("Add Template")}
                </Button>
              )}
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.templateItems || []}
            pagination={{ total: store?.templateTotal || 0, perPage }}
            rowsPerPage={perPage}
            currentPage={currentPage}
            handlePagination={(page) => {
              setCurrentPage(page + 1);
              loadData(page + 1, perPage, searchInput, selectedStatus?.value || "");
            }}
            handleRowPerPage={(rows) => {
              setPerPage(rows);
              setCurrentPage(1);
              loadData(1, rows, searchInput, selectedStatus?.value || "");
            }}
            loading={store?.loading}
          />
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default ContractTemplateList;

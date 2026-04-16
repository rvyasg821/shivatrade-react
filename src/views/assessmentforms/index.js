/* eslint-disable no-confusing-arrow */
import React, { Fragment, useEffect, useState, useCallback } from 'react'
import { Badge, Button, Card, CardBody, Col, Input, Row, UncontrolledTooltip } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import DatatablePagination from '../../@core/components/datatable/DatatablePagination';
import { useNavigate } from "react-router-dom";
import { appsRoot, defaultPerPageRow, ENUM_TOOLS_STATUS, ENUM_TOOLS_STATUS_COLOR } from '../../constants/defaultValues';
import { useDispatch, useSelector } from 'react-redux';
import { deleteAssessment, getAssessmentsList } from './store';
import classNames from 'classnames';
import { Edit, Eye, Trash2 } from 'react-feather';
import withReactContent from 'sweetalert2-react-content';
import Swal from "sweetalert2";
import { startLoading, stopLoading } from '../loadingstore';
import arrowForwardIcon from "../../assets/images/svg/arrow-forward.svg"

const AssessmentForms = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch()
  const mySwal = withReactContent(Swal);

  const authStore = useSelector((state) => state.auth);
  const assessmentStore = useSelector((state) => state.AssessmentForms);
  const authUserItem = authStore?.authUserItem || null;

  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");

  const handleAssessmentLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      dispatch(
        getAssessmentsList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch]
  );

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleAssessmentLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleAssessmentLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }

    return () => clearTimeout(handler);
  }, [searchInput, sort, sortColumn, rowsPerPage]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteAssessment(id)).then(() => {
            dispatch(getAssessmentsList())
          });
        }
      });
  };

  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (
        <span className={classNames("text-capitalize text-wrap text-primary", "cursor-pointer")}
          onClick={() => {
            navigate(`${appsRoot}/assessment-forms/edit/${row._id}`)
          }}
        >
          {row?.name || ""}
        </span>
      ),
    },
    {
      name: t("Description"),
      sortField: "description",
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.description || ""}</span>,
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      selector: (row) => (
        <Badge color={ENUM_TOOLS_STATUS_COLOR?.[row?.status]}>
          {t(ENUM_TOOLS_STATUS?.[row?.status]) || ""}
        </Badge>
      ),
    },
  ];

  const canEditForm = authUserItem?.role?.permissions?.assessment?.can_update;
  const canDeleteForm = authUserItem?.role?.permissions?.assessment?.can_delete;
  const canAddForm = authUserItem?.role?.permissions?.assessment?.can_add;
  const canViewForm = authUserItem?.role?.permissions?.assessment?.can_read;

  if (canEditForm || canDeleteForm || canViewForm) {
    columns.push(
      {
        name: t("Action"),
        center: true,
        cell: (row) => {

          const viewId = `assessmentform-view-tooltip-${row._id}`;
          const editId = `assessmentform-edit-tooltip-${row._id}`;
          const deleteId = `assessmentform-delete-tooltip-${row._id}`;

          return (
            <div className="d-flex align-items-center table-icon">
              {canEditForm && (
                <span className="me-50 cursor-pointer" id={editId}>
                  <Edit
                    size={18}
                    id={editId}
                    onClick={() =>
                      navigate(`${appsRoot}/assessment-forms/edit/${row._id}`)}
                    className="cursor-pointer"
                  >
                    <UncontrolledTooltip placement="top" target={editId}>
                      {t("Edit")}
                    </UncontrolledTooltip>
                  </Edit>
                </span>
              )}
              {canDeleteForm && (
                <span className="me-50 cursor-pointer" id={deleteId}>
                  <Trash2
                    size={20}
                    className="cursor-pointer"
                    id={deleteId}
                    onClick={() => handleDelete(row._id)}
                  />
                  <UncontrolledTooltip placement="top" target={deleteId}>
                    {t("Delete")}
                  </UncontrolledTooltip>
                </span>
              )}
              {canViewForm && (
                <span className="me-50 cursor-pointer" id={viewId}>
                  <UncontrolledTooltip placement="top" target={viewId}>
                    {t("View")}
                  </UncontrolledTooltip>
                  <Eye size={20} onClick={() => {
                    navigate(`${appsRoot}/assessment-forms/detail/${row._id}`)
                  }} />
                </span>
              )}
              {
                canViewForm && (
                  <img
                    alt="Arrow Forward"
                    src={arrowForwardIcon}
                    title={t("Assessment Submissions")}
                    className="cursor-pointer"
                    onClick={() => navigate(`${appsRoot}/assessment-forms/assessment-reports/${row?._id}`, {
                      state: { name: row?.name }
                    })}
                  />
                )}
            </div>
          );
        },
      },
    );
  }
  
  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleAssessmentLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleAssessmentLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleAssessmentLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    if (assessmentStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [assessmentStore?.loading]);

  console.log('assessmentStore?.assessmentItems ==>',assessmentStore?.assessmentItems);
  
  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Assessment Forms")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="4" className="me-auto">
                <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                  <Input
                    type="text"
                    id="search-assessment"
                    value={searchInput}
                    className="w-100 select"
                    placeholder={t("Search Assessment")}
                    onChange={(event) => handleSearch(event?.target?.value)}
                  />
                </div>
              </Col>
              <Col sm="4" md="3" className="text-end">
                {
                  canAddForm && (
                    <Button
                      color="primary"
                      onClick={() =>
                        navigate(`${appsRoot}/assessment-forms/add`, {
                          state: { from: "addBtn" },
                        })
                      }
                    >
                      {t("Add Assessment Form")}
                    </Button>
                  )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="user-table main-usertable">
                <DatatablePagination
                  columns={columns}
                  data={assessmentStore?.assessmentItems || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={assessmentStore?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  )
}

export default AssessmentForms;

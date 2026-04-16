/* eslint-disable object-shorthand */
// ** React Imports
import React, { useState, Fragment, useCallback, useLayoutEffect, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Eye, Trash2 } from "react-feather";

// ** Store & Actions
import { useSelector, useDispatch } from "react-redux";
// import { deleteAssessmentReport, getAssessmentReportList, cleanAssessmentReportMessage } from "views/userAssest/store";

// ** Reactstrap Imports
import { Col, Row, Card, CardBody, InputGroup, Input, Button } from "reactstrap";

// ** Custom Components
// import SimpleSpinner from "components/spinner/simple-spinner";
// import DatatablePagination from "components/DatatablePagination";

// ** Third Party Components
import Swal from "sweetalert2";
import withReactContent from 'sweetalert2-react-content';
import ReactSnackBar from "react-js-snackbar";
import { TiMessages } from "react-icons/ti";
import { BiSearch } from "../../components/SVGIcons";
import DatatablePagination from "../../../@core/components/datatable/DatatablePagination";
import { deleteAssessmentReport, getAssessmentReportsList } from "../userAssest/store";
// ** PNG Icons
import viewIcon from "../../../assets/images/svg/view.svg";
// import deleteIcon from "../../../assets/images/svg/delete.svg";
import { useTranslation } from "react-i18next";
import { appsRoot } from "../../../constants/defaultValues";

const defaultPerPageRow = 10;

const AsessmentReportList = () => {
  // ** Hooks
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mySwal = withReactContent(Swal);
  const { t } = useTranslation();

  const dispatch = useDispatch();
  // const store = useSelector((state) => state.assessmentReport);
  const store = useSelector((state) => state.assessmentReport);
  console.log('store AsessmentReportList ==>', store);
  console.log("store AsessmentReportList ==> paginations", store?.pagination);

  // ** States
  const [showSnackBar, setShowSnackbar] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  // ** Pagination
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  const handleAssessmentReportLists = useCallback((sorting = sort, sortCol = sortColumn, page = currentPage, perPage = rowsPerPage, search = searchInput) => {
    dispatch(getAssessmentReportsList({
      sort: sorting,
      sortColumn: sortCol,
      page,
      limit: perPage,
      search: search,
      asessmentId: id
    }))
  }, [sort, sortColumn, currentPage, rowsPerPage, searchInput, id, dispatch])

  const onSearchKey = (value) => {
    setSearchInput(value)
    handleAssessmentReportLists(sort, sortColumn, currentPage, rowsPerPage, value)
  }

  const handlePagination = (page) => {
    setCurrentPage(page + 1)
    handleAssessmentReportLists(sort, sortColumn, page + 1, rowsPerPage, searchInput)
  }

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection)
    setSortColumn(column.sortField)
    handleAssessmentReportLists(sortDirection, column.sortField, currentPage, rowsPerPage, searchInput)
  }

  const handlePerPage = (value) => {
    setRowsPerPage(value)
    handleAssessmentReportLists(sort, sortColumn, currentPage, value, searchInput)
  }

  const handleSearch = (value) => setSearchInput(value);

  useLayoutEffect(() => {
    handleAssessmentReportLists()
  }, [handleAssessmentReportLists])

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
          dispatch(deleteAssessmentReport(id)).then(() => {
            dispatch(getAssessmentReportsList())
          });
        }
      });
  };


  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      cell: (row) => row?.name,
    },
    {
      name: t("Email"),
      sortField: t("email"),
      sortable: true,
      cell: (row) => row?.email,
    },
    {
      name: t("Mobile"),
      sortField: "mobile",
      sortable: true,
      cell: (row) => row?.mobile,
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => (
        <Fragment>
          <div className="actions">
            <Eye
              // alt="View"
              size={20}
              src={viewIcon}
              // title="View"
              // cursor="pointer"
              className="cursor-pointer me-50"
              onClick={() => navigate(`${appsRoot}/assessment-forms/assessment-reports/detail/${row?._id}?asessmentId=${row?.assessment_id}`)}
            />
            <Trash2
              size={20}
              className="cursor-pointer"
              onClick={() => handleDelete(row?._id)}
            />
          </div>
        </Fragment>
      )
    }
  ]

  return (
    <Fragment>
      <div className="main-content">

        {/* {!store?.loading ? (<SimpleSpinner />) : null} */}

        {/* <ReactSnackBar Icon={(
          <span><TiMessages size={25} /></span>
        )} Show={showSnackBar}>
          {snackMessage}
        </ReactSnackBar> */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{location?.state?.name ? `${location?.state?.name} Submissions` : `Asessment Reports`}</h3>
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
                <Button
                  color="primary"
                  onClick={() => navigate("/apps/assessment-forms")}
                >
                  {t("Back")}
                </Button>
              </Col>
            </Row>
            <Row>
              <Row className="mt-2">
                <Col md="12" className="user-table main-usertable">
                  <DatatablePagination
                    data={store?.assessmentReportsList || []}
                    pagination={store?.pagination}
                    columns={columns}
                    handleSort={handleSort}
                    handlePagination={handlePagination}
                    handleRowPerPage={handlePerPage}
                    rowsPerPage={rowsPerPage}
                  />
                </Col>
              </Row>
            </Row>
          </CardBody>
        </Card>

      </div>
    </Fragment>
  )
}

export default AsessmentReportList;

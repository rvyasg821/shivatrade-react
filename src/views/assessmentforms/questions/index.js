// ** React Imports
import { useEffect, useState, Fragment, useCallback, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import Swal from "sweetalert2";
import withReactContent from 'sweetalert2-react-content';
import ReactSnackBar from "react-js-snackbar";
import { TiMessages } from "react-icons/ti";

import { defaultPerPageRow } from "utility/reduxConstant";
import { BiSearch } from "components/SVGIcons";
import editIcon from "assets/img/edit.svg";
import deleteIcon from "assets/img/delete.svg";
import { useTranslation } from "react-i18next";
const QuestionsList = () => {
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.questions);

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  const [showSnackBar, setShowSnackbar] = useState(false);
  const [snakebarMessage, setSnakbarMessage] = useState("");

  const handleQuestionLists = useCallback((sorting = sort, sortCol = sortColumn, page = currentPage, perPage = rowsPerPage, search = searchInput) => {
    dispatch(getQuestionList({
      sort: sorting,
      sortColumn: sortCol,
      page,
      limit: perPage,
      search: search
    }))
  }, [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch])

  const onSearchKey = (value) => {
    setSearchInput(value)
    handleQuestionLists(sort, sortColumn, currentPage, rowsPerPage, value)
  }

  const handlePagination = (page) => {
    setCurrentPage(page + 1)
    handleQuestionLists(sort, sortColumn, page + 1, rowsPerPage, searchInput)
  }

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection)
    setSortColumn(column.sortField)
    handleQuestionLists(sortDirection, column.sortField, currentPage, rowsPerPage, searchInput)
  }

  const handlePerPage = (value) => {
    setRowsPerPage(value)
    handleQuestionLists(sort, sortColumn, currentPage, value, searchInput)
  }

  useLayoutEffect(() => {
    handleQuestionLists()
  }, [handleQuestionLists])

  useEffect(() => {
    if (store.actionFlag || store?.success || store?.error) {
      dispatch(cleanQuestionMessage());
    }

    if (store.actionFlag === "QESTN_DLT_SCS") {
      handleQuestionLists()
    }

    if (store?.success) {
      setShowSnackbar(true);
      setSnakbarMessage(store.success);
    }

    if (store?.error) {
      setShowSnackbar(true);
      setSnakbarMessage(store.error);
    }
  }, [handleQuestionLists, store.success, store.error, store.actionFlag, dispatch]);

  useEffect(() => {
    setTimeout(() => {
      setShowSnackbar(false);
    }, 6000);
  }, [showSnackBar])

  const handleDelete = async (id) => {
    mySwal.fire({
      title: t('Are you sure?'),
      text: t("You won't be able to revert this!"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: t('Yes, delete it!')
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteQuestion(id))
      }
    })
  }

  const columns = [
    {
      name: t("question"),
      sortField: "question",
      sortable: true,
      cell: (row) => row?.question,
    },
    {
      name: t("Status"),
      center: true,
      selector: (row) => (
        <div className="badge">
          {row?.status ? (<span className="active">Active</span>) : <span className="inactive">InActive</span>}
        </div>
      )
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => (
        <Fragment>
          <div className="actions main-icon-td">
            <img
              alt="Edit"
              title="Edit"
              src={editIcon}
              className="cursor-pointer mr-2"
              onClick={() => navigate(`edit/${row?._id || ""}`)}
            />

            <img
              alt="Delete"
              title="Delete"
              src={deleteIcon}
              className="cursor-pointer"
              onClick={() => handleDelete(row?._id)}
            />
          </div>
        </Fragment>
      )
    }
  ]

  return (
    <div className="content data-list">
      <div className="container-fluid">
        {!store?.loading ? (<SimpleSpinner />) : null}
        <ReactSnackBar Icon={(
          <span><TiMessages size={25} /></span>
        )} Show={showSnackBar}>
          {snakebarMessage}
        </ReactSnackBar>

        <Row>
          <Col className="col-md-12 col-xxl-10 mx-auto">
            <Card className="card-content p-0">
          
              <CardBody>
                <Row className="top-content">
                  <Col sm="6">
                    <InputGroup>
                      <input
                        type="search"
                        aria-label="Search"
                        value={searchInput}
                        placeholder="Search"
                        className="col-input w-100"
                        onChange={(event) => onSearchKey(event?.target?.value)}
                      />
                      <span className="edit2-icons position-absolute">
                        <BiSearch />
                      </span>
                    </InputGroup>
                  </Col>

                  <Col sm="6" className="text-right">
                    <div className="buttons">
                        <button
                          onClick={() => navigate(`add`)}
                          className="btnprimary"
                          type="button"
                        >
                          {t('Add Question')}
                        </button>
                    </div>
                  </Col>
                </Row>

                <Row className="question-table mt-3">
                  <Col md="12">
                    <DatatablePagination
                      data={store?.questionItems || []}
                      columns={columns}
                      pagination={store?.pagination}
                      handleSort={handleSort}
                      handlePagination={handlePagination}
                      handleRowPerPage={handlePerPage}
                      rowsPerPage={rowsPerPage}
                    />
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default QuestionsList;

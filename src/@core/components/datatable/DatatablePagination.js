// ** React Imports
import { Fragment } from "react"

// ** Reactstrap Imports
import { Col, Label, Row } from "reactstrap"

// ** Third Party Components
import DataTable from "react-data-table-component"
import ReactPaginate from "react-paginate"
import { useTranslation } from "react-i18next"

// ** Constant
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues"
import { StyleSheetManager } from "styled-components"
import isPropValid from "@emotion/is-prop-valid"

const DatatablePagination = ({
  data = [],
  columns,
  customClass = "",
  loading = true,
  pagination,
  handleSort,
  currentPage,
  rowsPerPage = defaultPerPageRow,
  handleRowPerPage,
  handlePagination,
  displayEntriesLabel = true,
  disablePagination,
  selectableRows = false,
  onSelectedRowsChange,
  clearSelectedRows = false,
  // Reflects a caller-persisted selection (e.g. useBulkDelete) back onto the
  // checkboxes when a page's rows re-render, so paging away and back shows
  // previously-checked rows as still checked instead of just uncounted.
  selectableRowSelected,
  keyField,
}) => {
  /* Page change function */
  const { t } = useTranslation()
  const onPageChange = (page) => {
    if (handlePagination && (page?.selected || page?.selected === 0)) {
      handlePagination(page.selected)
    }
  }

  const onSortChange = (column, sortDirection) => {
    if (handleSort && column) {
      handleSort(column, sortDirection)
    }
  }

  const onChangePerPageRow = (value = "") => {
    if (handleRowPerPage) {
      handleRowPerPage(value)
    }
  }

  const getPageCount = () => {
    const count = pagination?.total || 1
    const limit = pagination?.perPage || 1
    const pages = Math.ceil(count / limit)

    return pages
  }

  const getCurrentPage = () => {
    let page = currentPage
    if (page > 0) { page -= 1 }

    return page
  }

  const getStartEndIndex = () => {
    const pageIndex = getCurrentPage()
    const count = pagination?.total || 1
    const limit = pagination?.perPage || 1
    const startIndex = (pageIndex * limit) + 1
    const endIndex = Math.min(startIndex - 1 + limit, count)

    return { start: startIndex, end: endIndex }
  }

  const DatatablePaginate = () => {
    return (
      <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
        <Col sm={6} xl={6}>
          <div className="d-block d-md-flex align-items-center justify-content-start">
            <div className="label-select">
              <Label className="pr-2 mb-0">{t("Show")}</Label>
              <select
                id="formSelectPage"
                value={rowsPerPage}
                className="form-select form-select-page"
                onChange={(event) => onChangePerPageRow(event?.target?.value)}
              >
                {perPageRowItems?.map((item) => (
                  <option key={item?.value} value={item?.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {displayEntriesLabel ? (
              <div className="text-muted text-center text-sm-start total-pagination">
                <Fragment>
                  {getStartEndIndex()?.start || 0}-{getStartEndIndex()?.end || 0} of{" "}
                  {pagination?.total || 0}
                </Fragment>
              </div>
            ) : null}
          </div>
        </Col>

        <Col sm={6} xl={6}>
          <ReactPaginate
            nextLabel={<i className="tim-icons icon-minimal-right" />}
            breakLabel="..."
            previousLabel={<i className="tim-icons icon-minimal-left" />}
            pageCount={getPageCount()}
            activeClassName="active"
            breakClassName="page-item"
            pageClassName={"page-item"}
            breakLinkClassName="page-link"
            nextLinkClassName={"page-link"}
            pageLinkClassName={"page-link"}
            nextClassName={"page-item next next-btn"}
            previousLinkClassName={"page-link"}
            previousClassName={"page-item prev prev-btn"}
            onPageChange={(page) => onPageChange(page)}
            forcePage={getCurrentPage()}
            containerClassName={`pagination react-paginate  align-items-center justify-content-xl-end mb-0 mt-xl-0`}
          />
        </Col>
      </Row>
    )
  }

  const shouldForwardProp = (propName, target) => {
    if (typeof target === "string") {
      return isPropValid(propName)
    }
    return true
  }

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <div className={`datatable ${customClass}`}>
        <DataTable
          // noHeader={true}
          columns={columns}
          data={data}
          pagination={disablePagination ? false : true}
          sortServer={true}
          responsive={true}
          onSort={onSortChange}
          persistTableHead={true}
          paginationServer={true}
          // Without this, RDTC's own internal CHANGE_PAGE reducer case wipes
          // its selection state on every page change (since paginationServer
          // is true and this defaults to false) BEFORE the new page's data
          // even arrives — firing onSelectedRowsChange with an empty
          // selection against the *old* page's still-current rows, which a
          // persisted-selection caller (useBulkDelete) then reads as "every
          // row on this page was just unchecked." This is the real cause of
          // the page-1→page-2 selection loss, not the persistence logic.
          paginationServerOptions={{ persistSelectedOnPageChange: true }}
          progressPending={!loading}
          className="react-dataTable"
          noDataComponent={
            <div className="error-message">{t('There are no records to display')}</div>
          }
          paginationComponent={DatatablePaginate}
          defaultSortField={pagination?.orderBy ? pagination.orderBy : ""}
          paginationDefaultPage={getCurrentPage()}
          selectableRows={selectableRows}
          onSelectedRowsChange={(state) => onSelectedRowsChange?.(state, data)}
          clearSelectedRows={clearSelectedRows}
          selectableRowSelected={selectableRowSelected}
          keyField={keyField}
          // Header-label nowrap (they were wrapping mid-word) is handled in
          // custom.scss (.rdt_TableCol_Sortable div) — a customStyles.headCells
          // rule here can't win against that selector's specificity, so don't
          // re-add one; it would just be dead code.
          customStyles={selectableRows ? {
            headRow: {
              style: {
                '& > div:first-child': { maxWidth: '50px', minWidth: '50px' },
              },
            },
            rows: {
              style: {
                '& > div:first-child': { maxWidth: '50px', minWidth: '50px' },
              },
            },
          } : {}}
        />
      </div>
    </StyleSheetManager>
  )
}

export default DatatablePagination

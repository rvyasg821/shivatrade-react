import { Fragment, useState, useEffect, useCallback } from "react";
import { Row, Col, Card, CardBody, Spinner, Badge } from "reactstrap";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { getDocumentList } from "@src/views/documents/store";
import DatatablePagination from "@components/datatable/DatatablePagination";

const DocumentsTab = ({ userId }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.document);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = useCallback(() => {
    if (!userId) return;
    dispatch(getDocumentList({
      user_id: userId,
      _limit: rowsPerPage,
      _offset: (currentPage - 1) * rowsPerPage,
      _sort: "_id",
      _order: "desc",
    }));
  }, [dispatch, userId, currentPage, rowsPerPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusColors = {
    active: "light-success",
    archived: "light-secondary",
    expired: "light-danger",
    pending_review: "light-warning",
  };

  const columns = [
    {
      name: t("Title"),
      minWidth: "200px",
      wrap: true,
      cell: (row) => (
        <div>
          <div className="fw-bold">{row?.title || "-"}</div>
          {row?.category?.name && <small className="text-muted">{row.category.name}</small>}
        </div>
      ),
    },
    {
      name: t("File"),
      minWidth: "150px",
      wrap: true,
      cell: (row) => (
        <div>
          <div>{row?.file_name || "-"}</div>
          {row?.expiry_date && <small className="text-muted">{t("Exp")}: {moment(row.expiry_date).format("DD MMM YYYY")}</small>}
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "120px",
      center: true,
      cell: (row) => (
        <Badge color={statusColors[row?.status] || "light-secondary"} pill className="text-capitalize">
          {row?.status?.replace("_", " ") || "-"}
        </Badge>
      ),
    },
    {
      name: t("Uploaded"),
      minWidth: "130px",
      center: true,
      cell: (row) => row?.createdAt ? moment(row.createdAt).format("DD MMM YYYY") : "-",
    },
  ];

  const data = store?.documentItems || [];
  const total = store?.pagination?.total || 0;

  return (
    <Fragment>
      {store?.loading === false ? (
        <div className="text-center my-4"><Spinner color="primary" /></div>
      ) : data.length > 0 ? (
        <DatatablePagination
          columns={columns}
          data={data}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          pagination={{ total, totalPage: Math.ceil(total / rowsPerPage) }}
          handlePagination={(page) => setCurrentPage(page + 1)}
          handleRowPerPage={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
        />
      ) : (
        <div className="text-center fw-semibold text-muted py-3">{t("No documents found.")}</div>
      )}
    </Fragment>
  );
};

export default DocumentsTab;

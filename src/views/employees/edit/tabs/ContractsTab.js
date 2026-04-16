import { Fragment, useState, useEffect, useCallback } from "react";
import { Spinner, Badge } from "reactstrap";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { getContractList } from "@src/views/contracts/store";
import DatatablePagination from "@components/datatable/DatatablePagination";

const ContractsTab = ({ userId }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.contract);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = useCallback(() => {
    if (!userId) return;
    dispatch(getContractList({
      _userId: userId,
      _limit: rowsPerPage,
      _offset: (currentPage - 1) * rowsPerPage,
    }));
  }, [dispatch, userId, currentPage, rowsPerPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusColors = {
    draft: "light-secondary",
    issued: "light-info",
    pending_signature: "light-warning",
    signed: "light-success",
    expired: "light-danger",
    terminated: "light-dark",
  };

  const columns = [
    {
      name: t("Template"),
      minWidth: "200px",
      wrap: true,
      cell: (row) => (
        <div>
          <div className="fw-bold">{row?.template?.name || row?.template_name || "-"}</div>
          {row?.effective_date && (
            <small className="text-muted">
              {moment(row.effective_date).format("DD MMM YYYY")}
              {row?.end_date && ` - ${moment(row.end_date).format("DD MMM YYYY")}`}
            </small>
          )}
        </div>
      ),
    },
    {
      name: t("Issued"),
      minWidth: "130px",
      center: true,
      cell: (row) => row?.issued_at ? moment(row.issued_at).format("DD MMM YYYY") : "-",
    },
    {
      name: t("Signed"),
      minWidth: "130px",
      center: true,
      cell: (row) => row?.signed_at ? moment(row.signed_at).format("DD MMM YYYY") : t("Not signed"),
    },
    {
      name: t("Status"),
      width: "150px",
      center: true,
      cell: (row) => (
        <Badge color={statusColors[row?.status] || "light-secondary"} pill className="text-capitalize">
          {row?.status?.replace("_", " ") || "-"}
        </Badge>
      ),
    },
  ];

  const data = store?.contractItems || [];
  const total = store?.contractTotal || 0;

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
        <div className="text-center fw-semibold text-muted py-3">{t("No contracts found.")}</div>
      )}
    </Fragment>
  );
};

export default ContractsTab;

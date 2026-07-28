// Reusable multi-select bulk-delete for DatatablePagination listings.
//
// The shared <DatatablePagination> already renders a checkbox column when
// `selectableRows` is set and reports selection via `onSelectedRowsChange`.
// This hook holds the selection, runs a confirm dialog, calls the caller's
// delete function (which must respect the module's own delete guard on the
// server) and reports how many were deleted vs skipped.
//
// Usage:
//   const bulk = useBulkDelete({
//     entityLabel: "categories",
//     deleteFn: (ids) => dispatch(deleteManyCategories(ids)).unwrap(),
//     onDone: () => handleList(),
//   });
//   // toolbar:
//   {canDelete && bulk.selectedRows.length > 0 && (
//     <Button color="danger" outline onClick={bulk.confirmBulkDelete}>
//       {t("Delete Selected")} ({bulk.selectedRows.length})
//     </Button>
//   )}
//   // table:
//   <DatatablePagination
//     selectableRows={canDelete}
//     onSelectedRowsChange={bulk.onSelectedRowsChange}
//     clearSelectedRows={bulk.toggleCleared}
//     ...
//   />
import { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useTranslation } from "react-i18next";

import Notification from "@components/toast/notification";

const mySwal = withReactContent(Swal);

export const useBulkDelete = ({
  entityLabel = "items",
  // (ids: string[]) => Promise<{ deleted?: any[]; deletedCount?: number;
  //   skipped?: Array<{ id, label?, reason? }> } | void>
  deleteFn,
  // Called after a successful (or partial) delete — usually the list refetch.
  onDone,
  // Field used as the row id. Most entities use `_id`.
  idKey = "_id",
}) => {
  const { t } = useTranslation();
  const [selectedRows, setSelectedRows] = useState([]);
  // Flipping this prop tells react-data-table-component to clear its checkboxes.
  const [toggleCleared, setToggleCleared] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onSelectedRowsChange = (state) =>
    setSelectedRows(state?.selectedRows || []);

  const clearSelection = () => {
    setSelectedRows([]);
    setToggleCleared((v) => !v);
  };

  const confirmBulkDelete = async () => {
    const ids = selectedRows.map((r) => r?.[idKey]).filter(Boolean);
    if (!ids.length || deleting) return;

    const result = await mySwal.fire({
      title: t("Delete selected?"),
      text: t(
        `This will delete ${ids.length} ${entityLabel}. Items that are in use will be skipped.`
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, delete"),
      cancelButtonText: t("Cancel"),
      customClass: {
        confirmButton: "btn btn-danger",
        cancelButton: "btn btn-outline-secondary ms-1",
      },
      buttonsStyling: false,
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const out = await deleteFn(ids);
      const skipped = out?.skipped || [];
      const deleted =
        out?.deleted?.length ??
        out?.deletedCount ??
        (Array.isArray(out?.deleted_ids)
          ? out.deleted_ids.length
          : ids.length - skipped.length);

      if (skipped.length) {
        Notification(
          "Warning",
          t(
            `${deleted} deleted · ${skipped.length} skipped (in use / has linked documents).`
          ),
          "warning"
        );
      } else {
        Notification(
          "Success",
          t(`${deleted} ${entityLabel} deleted.`),
          "success"
        );
      }
      clearSelection();
      if (onDone) onDone();
    } catch (e) {
      Notification(
        "Error",
        (typeof e === "string" && e) || e?.message || t("Delete failed"),
        "warning"
      );
    } finally {
      setDeleting(false);
    }
  };

  return {
    selectedRows,
    toggleCleared,
    deleting,
    onSelectedRowsChange,
    confirmBulkDelete,
    clearSelection,
  };
};

export default useBulkDelete;

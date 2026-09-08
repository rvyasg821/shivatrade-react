// Reusable multi-select bulk-delete for DatatablePagination listings.
//
// The shared <DatatablePagination> already renders a checkbox column when
// `selectableRows` is set and reports selection via `onSelectedRowsChange`.
// This hook holds the selection, runs a confirm dialog, calls the caller's
// delete function (which must respect the module's own delete guard on the
// server) and reports how many were deleted vs skipped.
//
// Selection PERSISTS across pages: `onSelectedRowsChange` only ever reports
// the checkbox state of the rows currently rendered on screen (one page's
// worth), so it's reconciled into a persistent id-keyed map rather than
// replacing the whole selection outright — otherwise paging away and back
// silently drops whatever was checked on the previous page.
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
//     selectableRowSelected={bulk.isRowSelected}
//     keyField={bulk.idKey}
//     ...
//   />
import { useCallback, useMemo, useState } from "react";
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
  // id -> row, accumulated across every page visited (not just the current one).
  const [selectedMap, setSelectedMap] = useState(new Map());
  // Flipping this prop tells react-data-table-component to clear its checkboxes.
  const [toggleCleared, setToggleCleared] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedRows = useMemo(() => Array.from(selectedMap.values()), [
    selectedMap,
  ]);
  const selectedIds = useMemo(() => new Set(selectedMap.keys()), [
    selectedMap,
  ]);

  // `pageRows` = every row currently rendered (the current page), so a row
  // absent from `state.selectedRows` but present in `pageRows` is a genuine
  // uncheck, not a row that simply isn't on screen. Rows on OTHER pages are
  // left untouched in the map.
  //
  // react-data-table-component re-derives its checkboxes from the
  // `selectableRowSelected` prop in a `useEffect` keyed on that prop's
  // *identity* — so if this handler always returns a brand-new Map (even
  // when nothing actually changed), the resulting new `isRowSelected`
  // reference re-triggers that effect, which re-fires this handler, which
  // makes another new Map... an infinite loop that shows as the checkbox
  // rapidly flickering. Bailing out with the *same* Map reference when the
  // selected id set is unchanged lets React skip the re-render and breaks
  // the cycle.
  const onSelectedRowsChange = (state, pageRows) => {
    const checkedIds = new Set(
      (state?.selectedRows || []).map((r) => r?.[idKey]).filter(Boolean)
    );
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const row of pageRows || []) {
        const id = row?.[idKey];
        if (!id) continue;
        if (checkedIds.has(id)) next.set(id, row);
        else next.delete(id);
      }
      if (next.size === prev.size && [...next.keys()].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
  };

  const isRowSelected = useCallback(
    (row) => selectedIds.has(row?.[idKey]),
    [selectedIds, idKey]
  );

  const clearSelection = () => {
    setSelectedMap(new Map());
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
    idKey,
    toggleCleared,
    deleting,
    onSelectedRowsChange,
    isRowSelected,
    confirmBulkDelete,
    clearSelection,
  };
};

export default useBulkDelete;

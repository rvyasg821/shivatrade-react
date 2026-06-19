// Full-page "Generate POV" flow — assign vendors + charges for a Sales Order's
// pending lines and create one Vendor PO per vendor. Reuses PoVendorRecoverModal
// in `asPage` mode (same pattern as the Generate Sales Order page). On success
// it redirects back to the Sales Order detail.

import { Fragment, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { getPurchaseOrder } from "@src/views/purchase-orders/store";
import PoVendorRecoverModal from "@src/views/_shared/po-vendor/PoVendorRecoverModal";
import { appsRoot } from "@constant/defaultValues";

const GeneratePov = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const po = useSelector((s) => s.purchaseOrder?.purchaseOrderItem) || {};

  // Load the PO for the header voucher label (if not already in store).
  useEffect(() => {
    if (poId && po?._id !== poId) dispatch(getPurchaseOrder(poId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  const backToSo = () =>
    navigate(`${appsRoot}/purchase-orders/view/${poId}`);

  return (
    <Fragment>
      <div className="app-user-view">
        <PoVendorRecoverModal
          asPage
          isOpen
          purchaseOrder={po}
          toggle={backToSo}
          onCreated={() => backToSo()}
        />
      </div>
    </Fragment>
  );
};

export default GeneratePov;

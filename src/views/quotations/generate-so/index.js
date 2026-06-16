// Full-page "Generate Sales Order & Vendor POs" wizard — promotes the former
// popup into a dedicated page (it's a big, multi-step process). Reuses the
// shared PoGeneratePreviewModal in `asPage` mode; on success redirects to the
// new Sales Order detail, where the SO + each vendor PO can be edited.

import { Fragment, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { getQuotation } from "@src/views/quotations/store";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
import { appsRoot } from "@constant/defaultValues";

const GenerateSalesOrder = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const q = useSelector((s) => s.quotation?.quotationItem) || {};

  // Load the quotation for the header voucher label (if not already in store).
  useEffect(() => {
    if (quotationId && q?._id !== quotationId) dispatch(getQuotation(quotationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const backToQuotation = () =>
    navigate(`${appsRoot}/quotations/view/${quotationId}`);

  return (
    <Fragment>
      <div className="app-user-view">
        <PoGeneratePreviewModal
          asPage
          isOpen
          sourceType="quotation"
          sourceId={quotationId}
          sourceVoucherNo={q?.voucher_no}
          toggle={backToQuotation}
          onCreated={({ purchase_order }) => {
            if (purchase_order?._id) {
              navigate(`${appsRoot}/purchase-orders/view/${purchase_order._id}`);
            } else {
              backToQuotation();
            }
          }}
        />
      </div>
    </Fragment>
  );
};

export default GenerateSalesOrder;

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { startLoading, stopLoading } from "../views/loadingstore";

/**
 * useFormLoading — shows global loading overlay while submitting.
 *
 * Usage:
 *   const [submitting, setSubmitting] = useState(false);
 *   useFormLoading(submitting);
 *
 *   const onSubmit = async () => {
 *     setSubmitting(true);
 *     try { await dispatch(someAction()).unwrap(); }
 *     finally { setSubmitting(false); }
 *   };
 */
const useFormLoading = (submitting) => {
  const dispatch = useDispatch();
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (submitting && !wasSubmitting.current) {
      dispatch(startLoading());
    } else if (!submitting && wasSubmitting.current) {
      dispatch(stopLoading());
    }
    wasSubmitting.current = submitting;
  }, [submitting, dispatch]);

  // Cleanup — always stop loading on unmount
  useEffect(() => {
    return () => {
      if (wasSubmitting.current) {
        dispatch(stopLoading());
      }
    };
  }, [dispatch]);
};

export default useFormLoading;

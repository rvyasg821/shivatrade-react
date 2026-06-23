// In-app PDF viewer (blank-layout, full-screen). Opened in a new tab by
// `openPdfViewer({ kind, id, params })`. It fetches the PDF through the authed
// API, shows it in an iframe, and offers a Download button that saves the file
// with the CORRECT name (the browser's own Save on a blob tab can only use the
// blob's random id — this button is what fixes that).
//
// The tab stays on the frontend origin, so the backend host is never exposed.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Spinner, Button } from "reactstrap";
import { Download, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import { fetchPdfBlob } from "@src/utility/pdf";

const PdfViewer = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({
    loading: true,
    url: "",
    name: "",
    error: "",
  });
  const urlRef = useRef("");

  useEffect(() => {
    const kind = searchParams.get("kind");
    const id = searchParams.get("id");
    // The caller passes the proper filename via `name` (the API is a different
    // origin, so the response's Content-Disposition is not readable here).
    const nameParam = searchParams.get("name");
    // Everything other than kind/id/name is passed through as PDF params.
    const params = {};
    for (const [k, v] of searchParams.entries()) {
      if (k !== "kind" && k !== "id" && k !== "name") params[k] = v;
    }

    let cancelled = false;
    (async () => {
      try {
        const { blob, name: fetchedName } = await fetchPdfBlob({
          kind,
          id,
          params,
        });
        if (cancelled) return;
        const url = window.URL.createObjectURL(blob);
        const name = nameParam || fetchedName;
        urlRef.current = url;
        document.title = name;
        setState({ loading: false, url, name, error: "" });
      } catch (e) {
        if (cancelled) return;
        setState({
          loading: false,
          url: "",
          name: "",
          error: e?.response?.data?.message || t("Could not load the PDF."),
        });
      }
    })();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        window.URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const download = () => {
    if (!state.url) return;
    const a = document.createElement("a");
    a.href = state.url;
    a.download = state.name || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#525659",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 16px",
          background: "#1a2238",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <span
          ref={(el) => {
            // A global rule wins over an inline color here, so force white.
            if (el) el.style.setProperty("color", "#fff", "important");
          }}
          style={{
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {state.name || t("PDF")}
        </span>
        <Button
          color="primary"
          size="sm"
          onClick={download}
          disabled={!state.url}
        >
          <Download size={15} className="me-50" />
          {t("Download")}
        </Button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {state.loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Spinner color="light" />
          </div>
        ) : state.error ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              gap: 10,
            }}
          >
            <AlertTriangle size={30} />
            <div>{state.error}</div>
          </div>
        ) : (
          <iframe
            title={state.name || "PDF"}
            src={state.url}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        )}
      </div>
    </div>
  );
};

export default PdfViewer;

// The error table on step 2 of an import preview: the rows that will be
// skipped, and why.
//
// Every module had its own copy, which meant every module also had its own
// chance to get the layout wrong. The layout is the whole point here:
//
//   • Fixed height  — many bad rows scroll DOWN, the modal does not grow tall
//   • Fixed width   — many columns scroll SIDEWAYS, the modal does not grow wide
//   • No wrapping   — a long value scrolls rather than becoming three lines
//   • Details last  — the error text is what the user came for, so it is the
//                     widest column and always in the same place
//
// A module supplies only which columns identify one of its rows. Row number and
// the error text are added here, so no module can forget them.
//
// Props:
//   columns  – [{ header, cell(row), width? }]  identifying columns only
//   rows     – the FULL preview.rows array; error rows are picked out here
//   maxHeight – override the 400px scroll height if a module really needs to

import { Table } from "reactstrap";
import { useTranslation } from "react-i18next";

const ImportErrorTable = ({ columns = [], rows = [], maxHeight = 400 }) => {
  const { t } = useTranslation();
  const errorRows = (rows || []).filter((r) => r.status === "error");

  if (!errorRows.length) return null;

  return (
    <div
      style={{
        maxHeight: `${maxHeight}px`,
        // `auto` on both axes: this element is the only thing allowed to
        // overflow. The modal body never sees content wider than itself.
        overflow: "auto",
        maxWidth: "100%",
      }}
    >
      <Table size="sm" striped bordered className="mb-0">
        <thead>
          <tr>
            <th style={{ width: 56 }}>#</th>
            {columns.map((col, i) => (
              <th key={i} className="text-nowrap" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
            {/* Widest and last — the reason is what the user is reading for. */}
            <th style={{ minWidth: 240 }}>{t("Details")}</th>
          </tr>
        </thead>
        <tbody>
          {errorRows.map((row) => (
            <tr key={row.rowNum} className="table-danger">
              <td>{row.rowNum}</td>
              {columns.map((col, i) => (
                <td key={i} className="small text-nowrap">
                  {col.cell(row) || "—"}
                </td>
              ))}
              <td className="small text-danger">
                {row.errors?.join(", ") || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ImportErrorTable;

// Renders rows of {icon, label, value}. Skips rows whose value is empty.

const Row = ({ icon: Icon, label, value }) => {
  if (value === null || value === undefined || value === "" ) return null;
  return (
    <li className="d-flex align-items-start mb-75">
      {Icon ? (
        <Icon size={14} className="me-50 mt-25 text-muted flex-shrink-0" />
      ) : (
        <span style={{ width: 14, marginRight: 8, flexShrink: 0 }} />
      )}
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        {label ? <div className="text-muted small">{label}</div> : null}
        <div className="text-break" style={{ overflowWrap: "anywhere" }}>
          {value}
        </div>
      </div>
    </li>
  );
};

const DetailFieldList = ({ items = [], title }) => {
  const rendered = items.filter(
    (it) => it && it.value !== null && it.value !== undefined && it.value !== ""
  );
  if (!rendered.length && !title) return null;
  return (
    <div className="mb-1">
      {title ? (
        <h5 className="fw-bolder border-bottom pb-50 mb-1">{title}</h5>
      ) : null}
      <ul className="list-unstyled mb-0">
        {rendered.map((it, idx) => (
          <Row key={it.key || idx} {...it} />
        ))}
      </ul>
    </div>
  );
};

export default DetailFieldList;

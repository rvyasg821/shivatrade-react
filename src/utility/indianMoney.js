// Indian-format currency helper for KPI tiles.
//   ₹120          ← < ₹1,000
//   ₹4.5 K        ← thousands
//   ₹19.10 L      ← lakhs
//   ₹1.25 Cr      ← crores
//
// Accepts numbers or numeric strings (BE often returns sums as strings to
// avoid float drift). Always rupees — pass a different `symbol` for the
// rare non-INR tile (none today).

export const formatIndianMoney = (value, symbol = "₹") => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return `${symbol}0`;
  if (Math.abs(n) >= 1e7) return `${symbol}${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `${symbol}${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `${symbol}${(n / 1000).toFixed(1)} K`;
  return `${symbol}${n.toFixed(0)}`;
};

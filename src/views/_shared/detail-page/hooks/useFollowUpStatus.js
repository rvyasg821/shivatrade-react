// Translates a follow-up ISO date into a tone + human label.
// Returns { tone, label, days } — `days` is signed: negative = overdue.

const useFollowUpStatus = (followUpDate) => {
  if (!followUpDate) {
    return { tone: "secondary", label: "Not set", days: null };
  }
  const target = new Date(followUpDate);
  if (Number.isNaN(target.getTime())) {
    return { tone: "secondary", label: "Not set", days: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return {
      tone: "danger",
      label: `Overdue by ${Math.abs(days)}d`,
      days,
    };
  }
  if (days === 0) return { tone: "warning", label: "Due today", days };
  if (days <= 3) return { tone: "warning", label: `In ${days}d`, days };
  return { tone: "success", label: `In ${days}d`, days };
};

export default useFollowUpStatus;

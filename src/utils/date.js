// Returns "YYYY-MM-DD" for the given Date using its LOCAL calendar day.
//
// Do NOT use `date.toISOString().split("T")[0]` for this — toISOString()
// converts to UTC first. For a shop in India (IST, UTC+5:30), any time
// between 12:00 AM and 5:30 AM local is still the *previous* day in UTC.
// That bug was causing "today"/date-range defaults on Reports and Dashboard
// to point at yesterday during those early morning hours, silently
// excluding bills made just after midnight from sales totals.
export const toLocalDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

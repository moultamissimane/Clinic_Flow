// Returns today's date (YYYY-MM-DD) as seen in the given IANA time zone.
function todayInTimezone(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
}

module.exports = { todayInTimezone, formatTime };

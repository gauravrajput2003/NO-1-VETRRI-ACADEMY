const IST = 330 * 60000;
function monthPeriod(month, year, now = new Date()) {
  const local = new Date(now.getTime() + IST);
  const m = month === undefined ? local.getUTCMonth() + 1 : Number(month);
  const y = year === undefined ? local.getUTCFullYear() : Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2020 || y > local.getUTCFullYear() + 1) {
    throw Object.assign(new Error('Select a valid month and year.'), { status: 400 });
  }
  const start = new Date(Date.UTC(y, m - 1, 1) - IST);
  const end = new Date(Date.UTC(y, m, 1) - IST);
  return { month: m, year: y, start, end, asOf: new Date(Math.min(now.getTime(), end.getTime() - 1)), provisional: now < end };
}
function classStart(cls) {
  if (!/^\d{1,2}:\d{2}$/.test(cls.scheduledTime || '')) return null;
  const [hour, minute] = cls.scheduledTime.split(':').map(Number);
  if (hour > 23 || minute > 59 || !Number.isFinite(+new Date(cls.scheduledDate))) return null;
  const day = new Date(+new Date(cls.scheduledDate) + IST).toISOString().slice(0, 10);
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`);
}
module.exports = { monthPeriod, classStart };

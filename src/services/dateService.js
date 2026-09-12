function dateKey(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw Object.assign(new Error("Invalid date"), { statusCode: 400 });
  return date.toISOString().slice(0, 10);
}

function startOfDay(value) {
  const key = dateKey(value);
  return new Date(`${key}T00:00:00.000Z`);
}

function addDays(value, days) {
  const result = startOfDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isSameDay(left, right) {
  return dateKey(left) === dateKey(right);
}

export { dateKey, startOfDay, addDays, isSameDay };

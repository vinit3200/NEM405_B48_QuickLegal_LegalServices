'use strict';

function toDate(v) {
  if (v instanceof Date) return v;
  let d = new Date(v);
  if (isNaN(d.valueOf())) throw new Error(`Invalid date: ${v}`);
  return d;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  let A = toDate(aStart);
  let B = toDate(aEnd);
  let C = toDate(bStart);
  let D = toDate(bEnd);
  return (A < D) && (C < B);
}

function hasOverlap(existingSlots = [], candidateStart, candidateEnd) {
  for (let s of existingSlots) {
    if (rangesOverlap(s.start, s.end, candidateStart, candidateEnd)) return true;
  }
  return false;
}

function isWithinAvailability(availabilitySlot, dateToCheck) {
  let d = toDate(dateToCheck);
  let day = d.getDay(); 
  if (availabilitySlot.dayOfWeek !== day) return false;

  let pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  let hhmm = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  let current = hhmm(d);
  return (current >= availabilitySlot.startTime) && (current < availabilitySlot.endTime);
}

module.exports = { toDate, rangesOverlap, hasOverlap, isWithinAvailability };

export const PROJECT_TIME_ZONE = "America/Fortaleza";

export type DateInput = Date | string;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

type DateTimeParts = CalendarDateParts & {
  hour: number;
  minute: number;
  second: number;
};

const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>();

function getTimeZoneFormatter(timeZone: string) {
  const cached = timeZoneFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  timeZoneFormatters.set(timeZone, formatter);
  return formatter;
}

function toValidDate(value: DateInput) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida: ${String(value)}`);
  }

  return date;
}

function parseDateOnlyParts(value: string): CalendarDateParts | null {
  const trimmed = value.trim();
  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  return {
    year,
    month: month - 1,
    day,
  };
}

function getUtcCalendarDateParts(value: Date) {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth(),
    day: value.getUTCDate(),
  };
}

function getTimeZoneDateTimeParts(
  value: Date,
  timeZone = PROJECT_TIME_ZONE
): DateTimeParts {
  const formatter = getTimeZoneFormatter(timeZone);
  const parts = formatter.formatToParts(value);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.get("year")),
    month: Number(lookup.get("month")) - 1,
    day: Number(lookup.get("day")),
    hour: Number(lookup.get("hour")),
    minute: Number(lookup.get("minute")),
    second: Number(lookup.get("second")),
  };
}

function getCalendarDateParts(value: DateInput): CalendarDateParts {
  if (typeof value === "string") {
    const parsedDateOnly = parseDateOnlyParts(value);
    if (parsedDateOnly) {
      return parsedDateOnly;
    }
  }

  return getUtcCalendarDateParts(toValidDate(value));
}

function getTimeZoneOffsetMs(value: Date, timeZone = PROJECT_TIME_ZONE) {
  const parts = getTimeZoneDateTimeParts(value, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    value.getUTCMilliseconds()
  );

  return asUtc - value.getTime();
}

export function toProjectZonedDateTime(
  parts: CalendarDateParts & {
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  },
  timeZone = PROJECT_TIME_ZONE
) {
  const hour = parts.hour ?? 0;
  const minute = parts.minute ?? 0;
  const second = parts.second ?? 0;
  const millisecond = parts.millisecond ?? 0;

  const utcGuess = Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    hour,
    minute,
    second,
    millisecond
  );

  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let corrected = new Date(utcGuess - firstOffset);

  const secondOffset = getTimeZoneOffsetMs(corrected, timeZone);
  if (secondOffset !== firstOffset) {
    corrected = new Date(utcGuess - secondOffset);
  }

  return corrected;
}

export function getProjectDayBounds(value: DateInput, timeZone = PROJECT_TIME_ZONE) {
  const parts = getCalendarDateParts(value);

  return {
    start: toProjectZonedDateTime(
      { ...parts, hour: 0, minute: 0, second: 0, millisecond: 0 },
      timeZone
    ),
    end: toProjectZonedDateTime(
      { ...parts, hour: 23, minute: 59, second: 59, millisecond: 999 },
      timeZone
    ),
  };
}

export function normalizeDateRangeBoundary(
  value: DateInput | undefined,
  boundary: "start" | "end",
  timeZone = PROJECT_TIME_ZONE
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && parseDateOnlyParts(value)) {
    const bounds = getProjectDayBounds(value, timeZone);
    return boundary === "start" ? bounds.start : bounds.end;
  }

  return toValidDate(value);
}

export function getProjectCurrentDateReference(
  reference = new Date(),
  timeZone = PROJECT_TIME_ZONE
) {
  const parts = getTimeZoneDateTimeParts(reference, timeZone);
  return new Date(Date.UTC(parts.year, parts.month, parts.day));
}

export function getProjectCurrentMonthBounds(
  reference = new Date(),
  timeZone = PROJECT_TIME_ZONE
) {
  const parts = getTimeZoneDateTimeParts(reference, timeZone);
  const lastDay = new Date(Date.UTC(parts.year, parts.month + 1, 0)).getUTCDate();

  return {
    start: toProjectZonedDateTime(
      { year: parts.year, month: parts.month, day: 1 },
      timeZone
    ),
    end: toProjectZonedDateTime(
      {
        year: parts.year,
        month: parts.month,
        day: lastDay,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      },
      timeZone
    ),
  };
}

export function getProjectDateKey(value: Date, timeZone = PROJECT_TIME_ZONE) {
  const parts = getTimeZoneDateTimeParts(value, timeZone);
  const month = String(parts.month + 1).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${parts.year}-${month}-${day}`;
}

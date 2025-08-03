'use strict'

const mask = "o"

const microsecondsPerWeek = /** @type {const} */ (604800000); // 7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds

/**
 * @param {number} value 
 * @returns {number}
 */
const abs = (value) => (value ^ (value >> 31)) - (value >> 31)


const daySuffix = new Array(32).fill(0).map((_, i) => {
  if (i === 1 || i === 21 || i === 31) {
    return "st";
  } else if (i === 2 || i === 22) {
    return "nd";
  } else if (i === 3 || i === 23) {
    return "rd";
  } else {
    return "th";
  }
});

const NO_PAD = new Array(1e3).fill(0).map((_, i) => String(i));
const PAD_2 = new Array(1e2).fill(0).map((_, i) => String(i).padStart(2, '0'));
const PAD_3 = new Array(1e3).fill(0).map((_, i) => String(i).padStart(3, '0'));
const PAD_4 = new Array(1e4).fill(0).map((_, i) => String(i).padStart(4, '0'));

const HOURS_H = new Array(24).fill(0).map((_, i) => String(i % 12 || 12));
const HOURS_H_PAD = new Array(24).fill(0).map((_, i) => String(i % 12 || 12).padStart(2, '0'));
const MILLISECONDS_L = new Array(1e3).fill(0).map((_, i) => String(i).padStart(3, '0').slice(0, 2));

const TIMEZONE_OFFSET_O = new Map();
const TIMEZONE_OFFSET_P = new Map();

for (let tzOffset = -720; tzOffset <= 840; tzOffset += 15) {
  TIMEZONE_OFFSET_O.set(tzOffset, (tzOffset > 0 ? "-" : "+") +
    PAD_2[abs((tzOffset) / 60)] +
    PAD_2[abs((tzOffset) % 60)]
  )

  TIMEZONE_OFFSET_P.set(tzOffset, (tzOffset > 0 ? "-" : "+") +
    PAD_2[abs((tzOffset) / 60)] + ":" + PAD_2[abs((tzOffset) % 60)])
}

const dayOfWeekLookup = /**@type {const} */(["7", "1", "2", "3", "4", "5", "6"]);

/**
 * @type {Map<number, Date>}
 */
const firstThursdays = new Map();

/**
 * @type {(1|2|3|4|5|6|7)[]}
 */
const firstDaysOfWeekLookup = [1, 7, 6, 5, 4, 3, 2];

/**
 * @type {(0|1|2|3|4|5|6)[]}
 */
const thursdaySameWeekLookup = [6, 0, 1, 2, 3, 4, 5];

/**
 * Get the ISO 8601 week number
 * Based on comments from
 * http://techblog.procurios.nl/k/n618/news/view/33796/14863/Calculate-ISO-8601-week-and-year-in-javascript.html
 *
 * @param  {Date} `date`
 * @return {Number}
 */
const getWeek = (date) => {
  const Y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  // Remove time components of date
  const targetThursday = new Date(
    Y,
    m,
    d
  );

  // Change date to Thursday same week
  targetThursday.setDate(
    d - thursdaySameWeekLookup[targetThursday.getDay()] + 3
  );

  let firstThursday = firstThursdays.get(Y);
  if (!firstThursday) {
    // Take January 4th as it is always in week 1 (see ISO 8601)
    firstThursday = new Date(Y, 0, 4);

    // Change date to Thursday same week
    firstThursday.setDate(firstDaysOfWeekLookup[firstThursday.getDay()]);
    firstThursdays.set(Y, firstThursday);
  }

  // Check if daylight-saving-time-switch occurred and correct for it
  const ds =
    targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
  targetThursday.setHours(targetThursday.getHours() - ds);

  // Number of weeks between target Thursday and first Thursday
  const weekDiff = (targetThursday.getTime() - firstThursday.getTime()) / microsecondsPerWeek;
  return "" + (1 + ~~(weekDiff));
};

/**
 * Get day name
 * Yesterday, Today, Tomorrow if the date lies within, else fallback to Monday - Sunday
 * @param  {Object} options
 * @param  {Date} options.date - The date
 * @param  {function} options.D - Function to get the day of the week (0-6)
 * @param  {boolean} options.short - Whether to return short names (Tdy, Ysd, Tmw)
 * @return {String}
 */
const getDayName = ({ date, D, short }) => {
  // Get the timestamp of the date in milliseconds, since epoch in UTC
  const dateTimestamp = date.getTime();

  // Get the timestamp of the beginning of today in UTC by using Date.UTC,
  // We use the provided date's year, month, and date, and set hours, minutes,
  // seconds and milliseconds to 0.
  // We correct the timestamp by using the timezone offset of the provided date, to
  // ensure we are comparing the timestamps with the same timezone-offset.
  const localNow = new Date();
  const todayBeginTimestamp = Date.UTC(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate()
  ) - (localNow.getTimezoneOffset() * 60000);

  if (dateTimestamp >= todayBeginTimestamp) {
    if (dateTimestamp < (todayBeginTimestamp + 86400000)) { // within 24 hours
      return short ? 'Tdy' : 'Today';
    } else if (dateTimestamp < (todayBeginTimestamp + 172800000)) { // within 48 hours
      return short ? 'Tmw' : 'Tomorrow';
    }
  } else if (dateTimestamp > (todayBeginTimestamp - 86400000)) { // within the last 24 hours
    return short ? 'Ysd' : 'Yesterday';
  }

  return short ? i18n.dayNamesShort[D()] : i18n.dayNamesLong[D()];
};

const UTC_FNS = {
  getDate: Date.prototype.getUTCDate.call.bind(Date.prototype.getUTCDate),
  getDay: Date.prototype.getUTCDay.call.bind(Date.prototype.getUTCDay),
  getMonth: Date.prototype.getUTCMonth.call.bind(Date.prototype.getUTCMonth),
  getFullYear: Date.prototype.getUTCFullYear.call.bind(Date.prototype.getUTCFullYear),
  getHours: Date.prototype.getUTCHours.call.bind(Date.prototype.getUTCHours),
  getMinutes: Date.prototype.getUTCMinutes.call.bind(Date.prototype.getUTCMinutes),
  getSeconds: Date.prototype.getUTCSeconds.call.bind(Date.prototype.getUTCSeconds),
  getMilliseconds: Date.prototype.getUTCMilliseconds.call.bind(Date.prototype.getUTCMilliseconds),
  getTimezoneOffset: () => 0, // UTC does not have a timezone offset
}

const GMT_FNS = {
  getDate: Date.prototype.getDate.call.bind(Date.prototype.getDate),
  getDay: Date.prototype.getDay.call.bind(Date.prototype.getDay),
  getMonth: Date.prototype.getMonth.call.bind(Date.prototype.getMonth),
  getFullYear: Date.prototype.getFullYear.call.bind(Date.prototype.getFullYear),
  getHours: Date.prototype.getHours.call.bind(Date.prototype.getHours),
  getMinutes: Date.prototype.getMinutes.call.bind(Date.prototype.getMinutes),
  getSeconds: Date.prototype.getSeconds.call.bind(Date.prototype.getSeconds),
  getMilliseconds: Date.prototype.getUTCMilliseconds.call.bind(Date.prototype.getUTCMilliseconds),
  getTimezoneOffset: Date.prototype.getTimezoneOffset.call.bind(Date.prototype.getTimezoneOffset),
}

export class DateFormatter {
  #tokenRE = /d{1,4}|D{3,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|W{1,2}|[LlopSZN]|"[^"]*"|'[^']*'/g;

  #mode = 'GMT';

  #mask = '';

  #fns = GMT_FNS;
  #d = GMT_FNS.getDate;
  #D = GMT_FNS.getDay;
  #H = GMT_FNS.getHours;
  #L = GMT_FNS.getMilliseconds;
  #M = GMT_FNS.getMinutes;
  #m = GMT_FNS.getMonth;
  #o = GMT_FNS.getTimezoneOffset;
  #s = GMT_FNS.getSeconds;
  #yyyy = GMT_FNS.getFullYear;

  #tokenFns = [];

  i18n = /** @type {const} */ ({
    dayNamesShort: [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ],
    dayNamesLong: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    monthNamesLong: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    timeNames: ["a", "p", "am", "pm", "A", "P", "AM", "PM"],
  })

  constructor(mask, mode = 'GMT') {
    this.#mask = mask

    this.#mode = mode;

    if (this.#mode === 'UTC') {
      this.#d = UTC_FNS.getDate;
      this.#D = UTC_FNS.getDay;
      this.#H = UTC_FNS.getHours;
      this.#L = UTC_FNS.getMilliseconds;
      this.#M = UTC_FNS.getMinutes;
      this.#m = UTC_FNS.getMonth;
      this.#o = UTC_FNS.getTimezoneOffset;
      this.#s = UTC_FNS.getSeconds;
      this.#yyyy = UTC_FNS.getFullYear;
      this.#fns = UTC_FNS;
    }

    this.#tokenize()
  }

  #tokenize() {
    let match
    let pos = 0
    while ((match = this.#tokenRE.exec(this.#mask)) != null) {
      if (pos !== match.index) {
        const token = this.#mask.slice(pos, match.index);
        this.#tokenFns.push(() => token);
      }
      switch (match[0]) {
        case "d":
          this.#tokenFns.push(this.d.bind(this));
          break;
        case "dd":
          this.#tokenFns.push(this.dd.bind(this));
          break;
        case "ddd":
          this.#tokenFns.push(this.ddd.bind(this));
          break;
        case "dddd":
          this.#tokenFns.push(this.dddd.bind(this));
          break;
        case "DDD":
          this.#tokenFns.push(this.DDD.bind(this));
          break;
        case "DDDD":
          this.#tokenFns.push(this.DDDD.bind(this));
          break;
        case "h":
          this.#tokenFns.push(this.h.bind(this));
          break;
        case "hh":
          this.#tokenFns.push(this.hh.bind(this));
        case "H":
          this.#tokenFns.push(this.H.bind(this));
          break;
        case "HH":
          this.#tokenFns.push(this.HH.bind(this));
          break;
        case "l":
          this.#tokenFns.push(this.l.bind(this));
          break;
        case "L":
          this.#tokenFns.push(this.L.bind(this));
          break;
        case "m":
          this.#tokenFns.push(this.m.bind(this));
          break;
        case "mm":
          this.#tokenFns.push(this.mm.bind(this));
          break;
        case "mmm":
          this.#tokenFns.push(this.mmm.bind(this));
          break;
        case "mmmm":
          this.#tokenFns.push(this.mmmm.bind(this));
          break;
        case "M":
          this.#tokenFns.push(this.M.bind(this));
          break;
        case "MM":
          this.#tokenFns.push(this.MM.bind(this));
          break;
        case "N":
          this.#tokenFns.push(this.N.bind(this));
          break;
        case "o":
          this.#tokenFns.push(this.o.bind(this));
          break;
        case "p":
          this.#tokenFns.push(this.p.bind(this));
          break;
        case "s":
          this.#tokenFns.push(this.s.bind(this));
          break;
        case "ss":
          this.#tokenFns.push(this.ss.bind(this));
          break;
        case "S":
          this.#tokenFns.push(this.S.bind(this));
          break;
        case "t":
          this.#tokenFns.push(this.t.bind(this));
          break;
        case "tt":
          this.#tokenFns.push(this.tt.bind(this));
          break;
        case "T":
          this.#tokenFns.push(this.T.bind(this));
          break;
        case "TT":
          this.#tokenFns.push(this.TT.bind(this));
          break;
        case "W":
          this.#tokenFns.push(this.W.bind(this));
          break;
        case "WW":
          this.#tokenFns.push(this.WW.bind(this));
          break;
        case "yy":
          this.#tokenFns.push(this.yy.bind(this));
          break;
        case "yyyy":
          this.#tokenFns.push(this.yyyy.bind(this));
          break;
        default:
          if (match[0][0] === '\'' && match[0][match[0].length - 1] === '\'') {
            const token = match[0].slice(1, -1);
            this.#tokenFns.push(() => token);
            break;
          }
          console.log("Unknown token:", match[0]);
      }
      pos = this.#tokenRE.lastIndex;
    }

    if (pos !== this.#mask.length) {
      const token = this.#mask.slice(pos);
      this.#tokenFns.push(() => token);
    }
  }

  #validateDate(date) {
    if (date instanceof Date) {
      if (Number.isNaN(date.getTime())) {
        throw TypeError("Invalid date");
      }
    } else if (date || date === 0) {
      date = new Date(date);

      if (Number.isNaN(date.getTime())) {
        throw TypeError("Invalid date");
      }
    } else {
      date = new Date();
    }

    return date;
  }

  /**
   * @param {Date} date 
   * @returns {string}
   */
  format(date) {
    date = this.#validateDate(date);

    let result = '';

    for (let i = 0; i < this.#tokenFns.length; ++i) {
      result += this.#tokenFns[i](date);
    }

    return result;
  }

  /**
   * Day of the month as digits; no leading zero for single-digit 
   *
   * @param {Date} date 
   * @returns {'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|
   * '15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'26'|'27'|'28'|
   * '29'|'30'|'31'}
   */
  d(date) {
    return NO_PAD[this.#d(date)];
  }

  /**
   * Day of the month as digits; leading zero for single-digit days.
   *
   * @param {Date} date 
   * @returns {'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'|
   * '13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'26'|
   * '27'|'28'|'29'|'30'|'31'}
   */
  dd(date) {
    return PAD_2[this.#d(date)];
  }

  /**
   * Day of the week as a three-letter abbreviation.
   *
   * @param {Date} date
   * @returns {'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'}
   */
  ddd(date) {
    return this.i18n.dayNamesShort[this.#D(date)];
  }

  /**
   * Day of the week as its full name.
   * 
   * @param {Date} date
   * @returns {'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'}
   */
  dddd(date) {
    return this.i18n.dayNamesLong[this.#D(date)];
  }

  /**
   * "Ysd", "Tdy" or "Tmw" if date lies within these three days. Else fall back
   * to ddd.
   *
   * @param {Date} date 
   * @returns {ReturnType<typeof this.ddd>|'Tdy'|'Ysd'|'Tmw'}
   */
  DDD(date) {
    return getDayName({
      date,
      D: this.#D.bind(this),
      short: true,
      i18n: this.i18n
    });
  }

  /**
   * "Yesterday", "Today" or "Tomorrow" if date lies within these three days.
   * Else fall back to dddd.
   *
   * @param {Date} date 
   * @returns {ReturnType<typeof this.ddd>|'Today'|'Yesterday'|'Tomorrow'}
   */
  DDDD(date) {
    return getDayName({
      date,
      D: this.#D.bind(this),
      short: false,
      i18n: this.i18n
    });
  }

  /**
   * Hours; no leading zero for single-digit hours (12-hour clock).
   * 
   * @param {Date} date 
   * @returns {'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'}
   */
  h(date) {
    return HOURS_H[this.#H(date)];
  }

  /**
   * Hours; leading zero for single-digit hours (12-hour clock).
   */
  hh(date) {
    return HOURS_H_PAD[this.#H(date)];
  }

  /**
   * Hours; no leading zero for single-digit hours (24-hour clock). 
   * 
   * @param {Date} date 
   * @returns {'0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|
   * '14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'}
   */
  H(date) {
    return NO_PAD[this.#H(date)];
  }

  /**
   * Hours; leading zero for single-digit hours (24-hour clock).
   *
   * @param {Date} date 
   * @returns {'00'|'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|
   * '12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'}
   */
  HH(date) {
    return PAD_2[this.#H(date)];
  }

  /**
   * Milliseconds; gives 3 digits.
   *
   * @param {Date} date 
   * @returns {string}
   */
  l(date) {
    return PAD_3[this.#L(date)];
  }

  /**
   * Milliseconds; gives 2 digits.
   *
   * @param {Date} date 
   * @returns {string}
   */
  L(date) {
    return MILLISECONDS_L[this.#L(date)]
  }

  /**
   * Month as digits; no leading zero for single-digit 
   *
   * @param {Date} date 
   * @returns {'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'}
   */
  m(date) {
    return NO_PAD[this.#m(date) + 1];
  }

  /**
   * Day of the month as digits; leading zero for single-digit 
   *
   * @param {Date} date 
   * @returns {'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'}
   */
  mm(date) {
    return PAD_2[this.#m(date) + 1];
  }

  /**
   * month as three-letter 
   *
   * @param {Date} date 
   * @returns {string}
   */
  mmm(date) {
    return this.i18n.monthNamesShort[this.#m(date)];
  }

  /**
   * Month as its full name.
   * 
   * @param {Date} date 
   * @returns {string}
   */
  mmmm(date) {
    return this.i18n.monthNamesLong[this.#m(date)];
  }

  /**
   * Minutes; no leading zero for single-digit
   * 
   * @param {Date} date 
   * @returns {'0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|
   * '14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'22'|'23'|
   * '26'|'27'|'28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|
   * '40'|'41'|'42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'|
   * '54'|'55'|'56'|'57'|'58'|'59'}
   */
  M(date) {
    return NO_PAD[this.#M(date)];
  }

  /**
   * Minutes; leading zero for single-digit minutes.
   * 
   * @param {Date} date 
   * @returns {'00'|'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|
   * '12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|
   * '26'|'27'|'28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|
   * '40'|'41'|'42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'|
   * '54'|'55'|'56'|'57'|'58'|'59'}
   */
  MM(date) {
    return PAD_2[this.#M(date)];
  }

  /**
   * ISO 8601 numeric representation of the day of the week.
   *
   * @param {Date} date 
   * @returns {'1'|'2'|'3'|'4'|'5'|'6'|'7'}
   */
  N(date) {
    return dayOfWeekLookup[this.#D(date)];
  }

  /**
   * GMT/UTC timezone offset, e.g. -0500 or +0230.
   * 
   * @param {Date} date 
   * @returns {string}
   */
  o(date) {
    return TIMEZONE_OFFSET_O.get(this.#o(date))
  }

  /**
   * GMT/UTC timezone offset, e.g. -05:00 or +02:30.
   *
   * @param {Date} date 
   * @returns {string}
   */
  p(date) {
    return TIMEZONE_OFFSET_P.get(this.#o(date))
  }

  /**
   * Seconds; no leading zero for single-digit 
   * 
   * @param {Date} date 
   * @returns {'0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|
   * '14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'26'|'27'|
   * '28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|'40'|'41'|
   * '42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'|'54'|'55'|
   * '56'|'57'|'58'|'59'}
   */
  s(date) {
    return NO_PAD[this.#s(date)];
  }

  /**
   * Seconds; leading zero for single-digit seconds.
   *
   * @param {Date} date 
   * @returns {'00'|'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|
   * '12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|
   * '26'|'27'|'28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|
   * '40'|'41'|'42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'|
   * '54'|'55'|'56'|'57'|'58'|'59
   */
  ss(date) {
    return PAD_2[this.#s(date)];
  }

  /**
   * The date's ordinal suffix (st, nd, rd, or th). Works well with `d`.
   *
   * @param {Date} date 
   * @return {'st'|'nd'|'rd'|'th'}
   */
  S(date) {
    return daySuffix[this.#d(date)];
  }

  /**
   * Lowercase, single-character time marker string: a or p.
   * 
   * @param {Date} date
   * @returns {'A'|'P'}
   */
  t(date) {
    return this.#H(date) < 12
      ? this.i18n.timeNames[0]
      : this.i18n.timeNames[1]
  }

  /**
   * Lowercase, two-character time marker string: am or pm.
   * 
   * @param {Date} date 
   * @returns {'AM'|'PM'}
   */
  tt(date) {
    return this.#H(date) < 12
      ? this.i18n.timeNames[2]
      : this.i18n.timeNames[3]
  }

  /**
   * Uppercase, single-character time marker string: A or P.
   * 
   * @param {Date} date
   * @returns {'A'|'P'}
   */
  T(date) {
    return this.#H(date) < 12
      ? this.i18n.timeNames[4]
      : this.i18n.timeNames[5]
  }

  /**
   * Uppercase, two-character time marker string: AM or PM.
   * 
   * @param {Date} date 
   * @returns {'AM'|'PM'}
   */
  TT(date) {
    return this.#H(date) < 12
      ? this.i18n.timeNames[6]
      : this.i18n.timeNames[7]
  }

  /**
   * ISO 8601 week number of the year.
   * 
   * @param {Date} date
   * @returns {'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|
   * '15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'26'|'27'|'28'|'29'|
   * '30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|'40'|'41'|'42'|'43'|
   * '44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53}
   */
  get W() {
    return getWeek
  }

  /**
   * ISO 8601 week number of the year, leading zero for single-digit.
   * 
   * @param {Date} date
   * @returns {'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'|
   * '13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|'26'|
   * '27'|'28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|'40'|
   * '41'|'42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'}
   */
  get WW() {
    return (date) => PAD_2[getWeek(date)];
  }

  /**
   * Year as last two digits; leading zero for years less than 10.
   *
   * @param {Date} date 
   * @returns {'00'|'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|
   * '12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'21'|'22'|'23'|'24'|'25'|
   * '26'|'27'|'28'|'29'|'30'|'31'|'32'|'33'|'34'|'35'|'36'|'37'|'38'|'39'|
   * '40'|'41'|'42'|'43'|'44'|'45'|'46'|'47'|'48'|'49'|'50'|'51'|'52'|'53'|
   * '54'|'55'|'56'|'57'|'58'|'59'|'60'|'61'|'62'|'63'|'64'|'65'|'66'|'67'|
   * '68'|'69'|'70'|'71'|'72'|'73'|'74'|'75'|'76'|'77'|'78'|'79'|'80'|'81'|
   * '82'|'83'|'84'|'85'|'86'|'87'|'88'|'89'|'90'|'91'|'92'|'93'|'94'|'95'|
   * '96'|'97'|'98'|'99'}
   */
  yy(date) {
    return PAD_2[this.#yyyy(date) % 100]
  }

  /**
   * Year represented by four digits.
   *
   * @param {Date} date 
   * @returns {string}
   */
  yyyy(date) {
    return PAD_4[this.#yyyy(date)];
  }

  get tokens() {
    return this.#tokenFns;
  }
}

const date = new Date(2025, 7, 2, 12, 34, 56, 789);

console.assert(new DateFormatter(mask).d(date) === '2', 'd')
console.assert(new DateFormatter(mask).dd(date) === '02', 'dd')
console.assert(new DateFormatter(mask).ddd(date) === 'Sat', 'ddd')
console.assert(new DateFormatter(mask).dddd(date) === 'Saturday', 'dddd')
console.assert(new DateFormatter(mask).DDD(date) === 'Tdy', 'DDD')
console.assert(new DateFormatter(mask).DDDD(date) === 'Today', 'DDDD')
console.assert(new DateFormatter(mask).h(date) === '12'), 'h';
console.assert(new DateFormatter(mask).H(date) === '12'), 'H';
console.assert(new DateFormatter(mask).hh(date) === '12'), 'hh';
console.assert(new DateFormatter(mask).HH(date) === '12'), 'HH';
console.assert(new DateFormatter(mask).L(date) === '78'), 'L';
console.assert(new DateFormatter(mask).l(date) === '789'), 'l';
console.assert(new DateFormatter(mask).M(date) === '34'), 'M';
console.assert(new DateFormatter(mask).m(date) === '8', 'm')
console.assert(new DateFormatter(mask).mm(date) === '08', 'mm')
console.assert(new DateFormatter(mask).MM(date) === '34'), 'MM';
console.assert(new DateFormatter(mask).mmm(date) === 'Aug', 'mmm')
console.assert(new DateFormatter(mask).mmmm(date) === 'August', 'mmmm')
console.assert(new DateFormatter(mask).N(date) === '6', 'N')
console.assert(new DateFormatter(mask).o(date) === '+0200', 'o')
console.assert(new DateFormatter(mask).o(date) === '+0200'), 'o';
console.assert(new DateFormatter(mask).p(date) === '+02:00', 'p')
console.assert(new DateFormatter(mask).s(date) === '56'), 's';
console.assert(new DateFormatter(mask).S(date) === 'nd'), 'S';
console.assert(new DateFormatter(mask).ss(date) === '56'), 'ss';
console.assert(new DateFormatter(mask).t(date) === 'p'), 't';
console.assert(new DateFormatter(mask).tt(date) === 'pm'), 'tt';
console.assert(new DateFormatter(mask).T(date) === 'P'), 'T';
console.assert(new DateFormatter(mask).TT(date) === 'PM'), 'TT';
console.assert(new DateFormatter(mask).W(date) === '31', 'W')
console.assert(new DateFormatter(mask).WW(date) === '31', 'WW')
console.assert(new DateFormatter(mask).yy(date) === '25', 'yy')
console.assert(new DateFormatter(mask).yyyy(date) === '2025', 'yyyy')

console.log(new DateFormatter(mask).DDDD(date));
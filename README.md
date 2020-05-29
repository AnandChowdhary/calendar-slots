# 🗓️ Calendar Slots

Find availability for a user based on their calendar. Currently only for Google Calendar.

[![Node CI](https://img.shields.io/github/workflow/status/AnandChowdhary/calendar-slots/Node%20CI?label=GitHub%20CI&logo=github)](https://github.com/AnandChowdhary/calendar-slots/actions)
[![Travis CI](https://img.shields.io/travis/AnandChowdhary/calendar-slots?label=Travis%20CI&logo=travis%20ci&logoColor=%23fff)](https://travis-ci.org/AnandChowdhary/calendar-slots)
[![Dependencies](https://img.shields.io/librariesio/release/npm/calendar-slots)](https://libraries.io/npm/calendar-slots)
[![License](https://img.shields.io/npm/l/calendar-slots)](https://github.com/AnandChowdhary/calendar-slots/blob/master/LICENSE)
[![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/calendar-slots.svg)](https://snyk.io/test/npm/calendar-slots)
[![Based on Node.ts](https://img.shields.io/badge/based%20on-node.ts-brightgreen)](https://github.com/AnandChowdhary/node.ts)
[![npm type definitions](https://img.shields.io/npm/types/calendar-slots.svg)](https://unpkg.com/browse/calendar-slots/dist/index.d.ts)
[![npm package](https://img.shields.io/npm/v/calendar-slots.svg)](https://www.npmjs.com/package/calendar-slots)
[![npm downloads](https://img.shields.io/npm/dw/calendar-slots)](https://www.npmjs.com/package/calendar-slots)
[![Contributors](https://img.shields.io/github/contributors/AnandChowdhary/calendar-slots)](https://github.com/AnandChowdhary/calendar-slots/graphs/contributors)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[![npm](https://nodei.co/npm/calendar-slots.png)](https://www.npmjs.com/package/calendar-slots)

## 💡 Usage

Install the package from [npm](https://www.npmjs.com/package/calendar-slots):

```bash
npm install calendar-slots
```

Import and use:

```ts
import { findSlots } from "calendar-slots";

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const slots = await findSlots({
  slotDuration: 30, // Find 30 minute slots
  slots: 3, // Recommend 3 slots
  from: today, // Starting now
  to: tomorrow, // Until tomorrow
});

console.log(slots);
/* [
  { from: "Tue May 05 2020 12:00:00 GMT-0800 (PST)", to: "Tue May 05 2020 12:30:00 GMT-0800 (PST)" },
  { from: "Wed May 06 2020 09:30:00 GMT-0800 (PST)", to: "Wed May 06 2020 10:00:00 GMT-0800 (PST)" },
  { from: "Wed May 06 2020 14:30:00 GMT-0800 (PST)", to: "Wed May 06 2020 15:00:00 GMT-0800 (PST)" }
] */
```

Each `Slot` has two `Date` objects, `start` and `end`. The `from` and `to` properties accept native `Date` objects, `moment` objects, or [other values that moment understands](https://momentjs.com/docs/#/parsing/string) like date strings and UNIX timestamp numbers.

## ⚒️ Configuration

| Key                 | Type                       | Description                       |
| ------------------- | -------------------------- | --------------------------------- |
| `slotDuration`      | number                     | Duration in minutes               |
| `slots`             | number                     | Number of slots to find           |
| `from` (required)   | Date or similar            | Start time                        |
| `to` (required)     | Date or similar            | End time                          |
| `days`              | number[]                   | Days of the week to use           |
| `daily.timezone`    | string                     | Timezone for time restrictions    |
| `daily.from`        | [number, number?, number?] | Start [hours, minutes, seconds]   |
| `daily.to`          | [number, number?, number?] | End [hours, minutes, seconds]     |
| `strategies`        | string                     | Recommendation strategies         |
| `padding`           | number                     | Time (min) between events         |
| `slotFilter`        | (slot: Slot) => boolean    | Custom filter for available slots |
| `calendarId`        | string                     | Specific Google Calender ID       |
| `auth`              | Google API OAuth2 client   | API client to use                 |
| `user.accessToken`  | string                     | User's access token               |
| `user.refreshToken` | string                     | User's refresh token              |
| `log`               | boolean                    | Whether to console.log steps      |
| `logger`            | (...args: any[]) => void   | Custom function for logging       |

### Authentication

You can either specify `auth`, `calendar`, and `user`:

```ts
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
const oauth2Client = new google.auth.OAuth2(
  "Client ID",
  "Client Secret",
  "Redirect URL"
);
oauth2Client.setCredentials({
  access_token: "Access token",
  refresh_token: "Refresh token",
});
const calendar = google.calendar("v3");

const slots = await findSlots({
  from: new Date(),
  to: nextWeek,
  auth: oauth2Client,
  calendar: calendar,
});
```

Alternately, you can set the following environment variables and we'll setup the authentication:

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URL`
- `GOOGLE_CALENDAR_ACCESS`
- `GOOGLE_CALENDAR_REFRESH`

## 🗜️ Examples

### Slots on specific days

You might want to skip weekends when finding slots. Add the `days` property with an array of numbers (0 for Sunday, 6 for Saturday):

```ts
/**
 * Find 3 slots, 30 minutes, from today until next week
 * but only between Monday and Friday
 */
const slots = await findSlots({
  slotDuration: 30,
  slots: 3,
  from: new Date(),
  to: nextWeek,
  days: [1, 2, 3, 4, 5],
});
```

### Slots between specific times every day

You might want to find slots only between specific times of the day. Add the `daily` property:

```ts
/**
 * Find 3 slots, 30 minutes, from today until next week
 * but only between Monday and Friday
 * and only from 9:00 am to 5:30 pm, Pacific Time
 */
const slots = await findSlots({
  slotDuration: 30,
  slots: 3,
  from: new Date(),
  to: nextWeek,
  days: [1, 2, 3, 4, 5],
  daily: {
    timezone: "America/Los_Angeles",
    from: [9],
    to: [17, 30],
  },
});
```

### Prefer morning slots

You may want to increase the probability of getting certain slots, using strategies.

```ts
/**
 * Find 3 slots, 30 minutes, from today until next week
 * but only between Monday and Friday
 * and prefer morning slots rather than later in the day
 */
const slots = await findSlots({
  slotDuration: 30,
  slots: 3,
  from: new Date(),
  to: nextWeek,
  days: [1, 2, 3, 4, 5],
  strategies: ["heavy-mornings"],
});
```

Available strategies are:

- `linear` (default)
- `heavy-firsts` (prefer beginning of all slots)
- `heavy-lasts` (prefer ending of all slots)
- `heavy-centers` (prefer middle of all slots)
- `heavy-mornings` (prefer mornings)
- `heavy-afternoons` (prefer afternoons)
- `heavy-evenings` (prefer evenings)
- `heavy-mondays` (prefer Mondays)
- `heavy-tuesdays` (prefer Tuesdays)
- `heavy-wednesdays` (prefer Wednesdays)
- `heavy-fridays` (prefer Fridays)
- `heavy-saturday` (prefer Saturday)
- `heavy-sundays` (prefer Sundays)

There are no strategies for preference of light rather than heavy; however, this works: If you want light mornings, you can pass the strategies `["heavy-afternoons", "heavy-evenings"]`. Similarly, if you want light Fridays, you can pass `heavy-` other days.

## 👩‍💻 Development

Build TypeScript:

```bash
npm run build
```

Run unit tests and view coverage:

```bash
npm run test-without-reporting
```

## 📄 License

[MIT](./LICENSE) © [Anand Chowdhary](https://anandchowdhary.com)

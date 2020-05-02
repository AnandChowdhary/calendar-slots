# 🗓️ Calendar Slots

Opinionated starter for server-side Node.js libraries, with [TypeScript](https://github.com/microsoft/TypeScript), tests with [Jest](https://github.com/facebook/jest), automated releases with [GitHub Actions](https://github.com/features/actions) and [Semantic Release](https://github.com/semantic-release/semantic-release), and coverage reporting from [Travis CI](https://travis-ci.org) to [Coveralls](https://coveralls.io).

[![Node CI](https://img.shields.io/github/workflow/status/AnandChowdhary/calendar-slots/Node%20CI?label=GitHub%20CI&logo=github)](https://github.com/AnandChowdhary/calendar-slots/actions)
[![Travis CI](https://img.shields.io/travis/AnandChowdhary/calendar-slots?label=Travis%20CI&logo=travis%20ci&logoColor=%23fff)](https://travis-ci.org/AnandChowdhary/calendar-slots)
[![Dependencies](https://img.shields.io/librariesio/release/npm/calendar-slots)](https://libraries.io/npm/calendar-slots)
[![License](https://img.shields.io/npm/l/calendar-slots)](https://github.com/AnandChowdhary/calendar-slots/blob/master/LICENSE)
[![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/calendar-slots.svg)](https://snyk.io/test/npm/calendar-slots)
[![Based on Node.ts](https://img.shields.io/badge/based%20on-node.ts-brightgreen)](https://github.com/AnandChowdhary/calendar-slots)
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

// Authenticate Google Calendar API client
const oauth2Client = new google.auth.OAuth2();
const calendar = google.calendar("v1");

const slots = await findSlots({
  calendar,
  user: {
    clientId: "",
    clientSecret: "",
  },
});

console.log(slots); // Slot[]
```

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

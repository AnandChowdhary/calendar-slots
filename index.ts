import { google, calendar_v3 } from "googleapis";
import {
  OAuth2Client,
  JWT,
  Compute,
  UserRefreshClient,
} from "google-auth-library";
import { config } from "dotenv";
import { each } from "async-parallel";
import moment from "moment-timezone";
config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URL ??
    "https://developers.google.com/oauthplayground"
);
const globalCalendar = google.calendar("v3");

/**
 * Omit a key from an interface
 * @source https://stackoverflow.com/a/51804844/1656944
 */
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Split an array in equal chunks
 * @source https://stackoverflow.com/a/51514813/1656944
 */
const chunkArrayInGroups = <T = any>(arr: T[], parts: number) => {
  const arrayParts: T[][] = [];
  for (let i = parts; i > 0; i--)
    arrayParts.push(arr.splice(0, Math.ceil(arr.length / i)));
  return arrayParts;
};

/**
 * Get a random element from this array
 */
const randomItemFromArray = <T = any>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Live logging for debugging
 */
const log = (params: any, ...args: any[]) => {
  if (params.log) {
    if (typeof params.logger === "function") params.logger(...args);
    else console.log(args);
  }
};

export interface GetEventsParams {
  user?: {
    accessToken: string;
    refreshToken: string;
  };
  from: moment.MomentInput;
  to: moment.MomentInput;
  calendar?: calendar_v3.Calendar;
  calendarId?: string;
  auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient;
}
export interface Slot {
  start: Date;
  end: Date;
}

/**
 * Find a user's events from a single calendar
 * Defaults to their primary calendar
 */
export const getEventsFromSingleCalendar = async ({
  user,
  from,
  to,
  calendar,
  calendarId,
  auth,
}: GetEventsParams) => {
  oauth2Client.setCredentials({
    access_token: user?.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS,
    refresh_token: user?.refreshToken ?? process.env.GOOGLE_CALENDAR_REFRESH,
  });
  return (
    (
      await (calendar ?? globalCalendar).events.list({
        timeMin: from ? moment(from).toISOString() : undefined,
        timeMax: to ? moment(to).toISOString() : undefined,
        auth: auth ?? oauth2Client,
        calendarId: calendarId ?? "primary",
        maxResults: 3,
      })
    ).data.items || []
  );
};

/**
 * Get a list of user's events from all calendars
 */
export const getEventsFromAllCalendars = async (
  params: Omit<GetEventsParams, "calendarId">
) => {
  oauth2Client.setCredentials({
    access_token:
      params.user?.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS,
    refresh_token:
      params.user?.refreshToken ?? process.env.GOOGLE_CALENDAR_REFRESH,
  });
  const auth = params.auth ?? oauth2Client;
  const calendars = await (
    params.calendar ?? globalCalendar
  ).calendarList.list({ auth });
  const allEvents: calendar_v3.Schema$Event[] = [];
  await each<calendar_v3.Schema$Event, void>(
    calendars.data.items ?? [],
    async (cal) => {
      if (cal.id) {
        const events = await getEventsFromSingleCalendar({
          ...params,
          calendarId: cal.id,
        });
        allEvents.push(...events);
      }
    },
    { concurrency: 5 }
  );
  return allEvents;
};

/**
 * List all free slots for a user
 */
export const getSlots = async (
  params: GetEventsParams & {
    log?: boolean;
    slotDuration?: number;
    slots?: number;
    days?: number[];
    daily?: {
      timezone: string;
      from: [number, number?, number?];
      to: [number, number?, number?];
    };
    slotFilter?: (slot: Slot) => boolean;
    logger?: (...args: any[]) => void;
  }
): Promise<Slot[]> => {
  // Default slot duration is 30 minutes
  const slotDuration = params.slotDuration ?? 30;
  const daysAllowed = params.days ?? [0, 1, 2, 3, 4, 5, 6];
  delete params.slotDuration;

  // Find all slots
  const allPotentialSlots: Slot[] = [];
  const differenceInMinutes = moment(params.to).diff(params.from, "minutes");
  let endDate = moment(params.from).hours(0).minutes(0).seconds(0);
  while (moment(endDate).isBefore(params.to)) {
    const start = endDate;
    const end = moment(start).add(slotDuration, "minutes");
    const now = moment();

    if (
      daysAllowed.includes(moment(start).day()) &&
      daysAllowed.includes(end.day()) &&
      start.isAfter(
        moment(params.from)
          .hours(params.daily?.from[0] ?? 0)
          .minutes(params.daily?.from[1] ?? 0)
          .seconds(params.daily?.from[2] ?? 0)
      ) &&
      end.isBefore(
        moment(params.to)
          .hours(params.daily?.to[0] ?? 0)
          .minutes(params.daily?.to[1] ?? 0)
          .seconds(params.daily?.to[2] ?? 0)
      ) &&
      start.isAfter(now)
    ) {
      const startTime = moment(start);
      const endTime = moment(end);

      let dailyConditionsMet = true;
      if (params.daily)
        if (
          moment.tz(startTime, params.daily.timezone).isBefore(
            moment
              .tz(startTime, params.daily.timezone)
              .hours(params.daily.from[0])
              .minutes(params.daily.from[1] ?? 0)
              .seconds(params.daily.from[2] ?? 0)
          ) ||
          moment.tz(endTime, params.daily.timezone).isAfter(
            moment
              .tz(endTime, params.daily.timezone)
              .hours(params.daily.to[0])
              .minutes(params.daily.to[1] ?? 0)
              .seconds(params.daily.to[2] ?? 0)
          )
        )
          dailyConditionsMet = false;

      if (dailyConditionsMet)
        allPotentialSlots.push({
          start: startTime.toDate(),
          end: endTime.toDate(),
        });
    }
    endDate = end;
  }
  log(params, `Total potential slots are ${allPotentialSlots.length}`);
  if (!allPotentialSlots.length) return [];

  let calendarEvents: calendar_v3.Schema$Event[] = [];
  let timer = new Date().getTime();
  if (params.calendarId)
    calendarEvents = await getEventsFromSingleCalendar(params);
  else calendarEvents = await getEventsFromAllCalendars(params);
  log(
    params,
    `Fetched ${calendarEvents.length} events from ${
      params.calendarId ?? "all calendars"
    } in ${(new Date().getTime() - timer) / 1000} seconds`
  );

  let recommendedSlots = allPotentialSlots.filter((slot) => {
    let conflict = false;
    calendarEvents.forEach((event) => {
      if (
        event.start?.dateTime &&
        event.end?.dateTime &&
        moment(slot.start).isAfter(event.start.dateTime) &&
        moment(slot.end).isBefore(event.end.dateTime)
      )
        conflict = true;
    });
    return !conflict;
  });

  if (typeof params.slotFilter === "function")
    recommendedSlots = recommendedSlots.filter(params.slotFilter);

  if (params.slots) {
    if (recommendedSlots.length <= params.slots) return recommendedSlots;
    const parts = chunkArrayInGroups(recommendedSlots, params.slots);
    const randomSlots: Slot[] = [];
    for (let i = 0; i < params.slots; i++)
      randomSlots.push(randomItemFromArray(parts[i]));
    log(params, `Recommending ${randomSlots.length} slots`);
    return randomSlots;
  }

  return recommendedSlots;
};

import { google, calendar_v3 } from "googleapis";
import {
  OAuth2Client,
  JWT,
  Compute,
  UserRefreshClient,
} from "google-auth-library";
import { config } from "dotenv";
import { each } from "async-parallel";
import ical, { VEvent } from "node-ical";
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

/** Slot deciding strategies */
export type Strategy =
  | "linear"
  | "heavy-firsts"
  | "heavy-lasts"
  | "heavy-corners"
  | "heavy-mornings"
  | "heavy-afternoons"
  | "heavy-evenings"
  | "heavy-mondays"
  | "heavy-tuesdays"
  | "heavy-wednesdays"
  | "heavy-fridays"
  | "heavy-saturday"
  | "heavy-sundays"
  | "light-firsts"
  | "light-lasts"
  | "light-corners"
  | "light-mornings"
  | "light-afternoons"
  | "light-evenings"
  | "light-mondays"
  | "light-tuesdays"
  | "light-wednesdays"
  | "light-fridays"
  | "light-saturday"
  | "light-sundays";

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
 * Get a random element from this array, strategy-weighted
 */
export const weightedItemFromArray = (
  params: GetEventsParams & GetSlotsParams,
  arr: Slot[],
  strategies: Strategy[]
) => {
  const originalArray = [...arr];
  const addExtraWeight = (
    weighter: (array: Slot[], index: number) => number
  ) => {
    originalArray.forEach((item, index) => {
      for (
        let i = 0;
        i <
        Math.round(weighter(originalArray, index) * ((params.weight ?? 2) - 1));
        i++
      )
        arr.push(item);
    });
  };
  if (strategies.includes("heavy-firsts"))
    addExtraWeight((array, index) => (array.length - index) / array.length);
  if (strategies.includes("heavy-lasts"))
    addExtraWeight((array, index) => index / array.length);
  if (strategies.includes("heavy-corners"))
    addExtraWeight(
      (array, index) => Math.abs(array.length / 2 - index) / (array.length / 2)
    );
  [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ].forEach((day, dayIndex) => {
    if (
      strategies.includes(`heavy-${day}s` as Strategy) &&
      params.daily?.timezone
    )
      addExtraWeight((array, index) =>
        moment.tz(array[index].start, params.daily?.timezone ?? "").day() ===
        dayIndex
          ? 1
          : 0
      );
  });
  if (strategies.includes("heavy-mornings") && params.daily?.timezone)
    addExtraWeight((array, index) =>
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() > 5 &&
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() < 12
        ? 1
        : 0
    );
  if (strategies.includes("heavy-afternoons") && params.daily?.timezone)
    addExtraWeight((array, index) =>
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() >
        11 &&
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() < 4
        ? 1
        : 0
    );
  if (strategies.includes("heavy-evenings") && params.daily?.timezone)
    addExtraWeight((array, index) =>
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() > 3 &&
      moment.tz(array[index].start, params.daily?.timezone ?? "").hours() < 6
        ? 1
        : 0
    );
  return arr[Math.floor(Math.random() * arr.length)];
};

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
export interface GetSlotsParams {
  log?: boolean;
  slotDuration?: number;
  slots?: number;
  padding?: number;
  url?: string;
  strategies?: Strategy[];
  weight?: number;
  days?: number[];
  daily?: {
    timezone: string;
    from?: [number, number?, number?];
    to?: [number, number?, number?];
  };
  slotFilter?: (slot: Slot) => boolean;
  logger?: (...args: any[]) => void;
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
 * Get calendar events from a webcal ICS URL
 */
export const getEventsFromWebcal = async (url: string) => {
  const directEvents = await ical.async.fromURL(
    url.replace("webcal:", "http:")
  );
  return Object.values(directEvents)
    .filter((i) => i.type === "VEVENT")
    .map((i) => {
      const event = i as VEvent;
      return {
        start: {
          dateTime: event.start.toISOString(),
        },
        end: {
          dateTime: event.end.toISOString(),
        },
      };
    });
};

/**
 * List all free slots for a user
 */
export const getSlots = async (
  params: GetEventsParams & GetSlotsParams
): Promise<Slot[]> => {
  // Default slot duration is 30 minutes
  const slotDuration = params.slotDuration ?? 30;
  const daysAllowed = params.days ?? [0, 1, 2, 3, 4, 5, 6];
  const strategies = params.strategies ?? ["linear"];
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
          .hours((params.daily?.from ?? [])[0] ?? 0)
          .minutes((params.daily?.from ?? [])[1] ?? 0)
          .seconds((params.daily?.from ?? [])[2] ?? 0)
      ) &&
      end.isBefore(
        moment(params.to)
          .hours((params.daily?.to ?? [])[0] ?? 0)
          .minutes((params.daily?.to ?? [])[1] ?? 0)
          .seconds((params.daily?.to ?? [])[2] ?? 0)
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
              .hours((params.daily.from ?? [])[0] ?? 0)
              .minutes((params.daily.from ?? [])[1] ?? 0)
              .seconds((params.daily.from ?? [])[2] ?? 0)
          ) ||
          moment.tz(endTime, params.daily.timezone).isAfter(
            moment
              .tz(endTime, params.daily.timezone)
              .hours((params.daily.to ?? [])[0] ?? 0)
              .minutes((params.daily.to ?? [])[1] ?? 0)
              .seconds((params.daily.to ?? [])[2] ?? 0)
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

  let calendarEvents: {
    start?: { dateTime?: string | null };
    end?: { dateTime?: string | null };
  }[] = [];
  let timer = new Date().getTime();
  if (params.user || params.auth || params.calendarId || params.calendar) {
    if (params.calendarId)
      calendarEvents = await getEventsFromSingleCalendar(params);
    else calendarEvents = await getEventsFromAllCalendars(params);
    log(
      params,
      `Fetched ${calendarEvents.length} events from ${
        params.calendarId ?? "all calendars"
      } in ${(new Date().getTime() - timer) / 1000} seconds`
    );
  } else if (params.url) {
    calendarEvents = await getEventsFromWebcal(params.url);
    log(params, `Fetched ${calendarEvents.length} events from Webcal`);
  } else {
    log(params, "Skipped fetching calendar events");
  }

  let recommendedSlots = allPotentialSlots.filter((slot) => {
    let conflict = false;
    calendarEvents.forEach((event) => {
      if (
        event.start?.dateTime &&
        event.end?.dateTime &&
        moment(slot.start)
          .subtract(params.padding ?? 0, "minutes")
          .isAfter(event.start.dateTime) &&
        moment(slot.end)
          .add(params.padding ?? 0, "minutes")
          .isBefore(event.end.dateTime)
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
    for (let i = 0; i < params.slots; i++) {
      let hasSlot = true;
      let slot = weightedItemFromArray(params, parts[i], strategies);
      while (hasSlot) {
        slot = weightedItemFromArray(params, parts[i], strategies);
        hasSlot =
          randomSlots.find(
            (item) =>
              item.start.getTime() === slot.start.getTime() &&
              item.end.getTime() === slot.end.getTime()
          ) !== undefined;
      }
      randomSlots.push(slot);
    }
    log(params, `Recommending ${randomSlots.length} slots`);
    return randomSlots;
  }

  return recommendedSlots;
};

import { google, calendar_v3 } from "googleapis";
import {
  OAuth2Client,
  JWT,
  Compute,
  UserRefreshClient,
} from "google-auth-library";
import { config } from "dotenv";
import moment from "moment";
config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URL ??
    "https://developers.google.com/oauthplayground"
);
const calendar = google.calendar("v3");

/*
 * Omit a key from an interface
 * @source https://stackoverflow.com/a/51804844/1656944
 */
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface GetEventsParams {
  user?: {
    accessToken: string;
    refreshToken: string;
  };
  from: moment.MomentInput;
  to: moment.MomentInput;
  calendarId?: string;
  auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient;
}
export interface Slot {
  start: Date;
  end: Date;
}

/*
 * Find a user's events from a single calendar
 * Defaults to their primary calendar
 */
export const getEventsFromSingleCalendar = async ({
  user,
  from,
  to,
  calendarId,
  auth,
}: GetEventsParams) => {
  oauth2Client.setCredentials({
    access_token: user?.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS,
    refresh_token: user?.refreshToken ?? process.env.GOOGLE_CALENDAR_REFRESH,
  });
  return (
    (
      await calendar.events.list({
        timeMin: from ? moment(from).toISOString() : undefined,
        timeMax: to ? moment(to).toISOString() : undefined,
        auth: auth ?? oauth2Client,
        calendarId: calendarId ?? "primary",
        maxResults: 3,
      })
    ).data.items || []
  );
};

/*
 * Get a list of events from all calendars
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
  const calendars = await calendar.calendarList.list({ auth });
  const allEvents: calendar_v3.Schema$Event[] = [];
  for await (const calendar of calendars.data.items ?? []) {
    if (calendar.id) {
      const events = await getEventsFromSingleCalendar({
        ...params,
        calendarId: calendar.id,
      });
      allEvents.push(...events);
    }
  }
  return allEvents;
};

export const getSlots = async (
  params: GetEventsParams & {
    slotDuration?: number;
    slotFilter?: (slot: Slot) => boolean;
  }
) => {
  // Default slot duration is 30 minutes
  const slotDuration = params.slotDuration ?? 30;
  delete params.slotDuration;

  // Find all slots
  const allPotentialSlots: Slot[] = [];
  const differenceInMinutes = moment(params.to).diff(params.from, "minutes");
  let endDate = params.from;
  while (moment(endDate).isBefore(params.to)) {
    const start = endDate;
    const end = moment(start).add(slotDuration, "minutes");
    if (end.isBefore(params.to))
      allPotentialSlots.push({
        start: moment(start).toDate(),
        end: moment(end).toDate(),
      });
    endDate = end;
  }
  return console.log("Slots are", allPotentialSlots.length);

  let events: calendar_v3.Schema$Event[];
  if (params.calendarId) {
    events = await getEventsFromSingleCalendar(params);
  } else {
    events = await getEventsFromAllCalendars(params);
  }
  console.log("FINDING SLOTS FROM EVENTS", events.length);
};

const test = async () => {
  const result = await getSlots({
    slotDuration: 30,
    from: new Date(),
    to: new Date("2020-05-10"),
  });
  console.log("RESULT", result);
};

test();

import { google, calendar_v3 } from "googleapis";
import {
  OAuth2Client,
  JWT,
  Compute,
  UserRefreshClient,
} from "google-auth-library";
import { config } from "dotenv";
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

export interface IGetEventsParams {
  user?: {
    accessToken: string;
    refreshToken: string;
  };
  from?: Date;
  to?: Date;
  calendarId?: string;
  auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient;
  timeZone?: string;
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
  timeZone,
}: IGetEventsParams) => {
  oauth2Client.setCredentials({
    access_token: user?.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS,
    refresh_token: user?.refreshToken ?? process.env.GOOGLE_CALENDAR_REFRESH,
  });
  return (
    await calendar.events.list({
      timeMin: from?.toISOString(),
      timeMax: to?.toISOString(),
      auth: auth ?? oauth2Client,
      calendarId: calendarId ?? "primary",
      timeZone,
      maxResults: 3,
    })
  ).data;
};

/*
 * Get a list of events from all calendars
 */
export const getEventsFromAllCalendars = async (
  params: Omit<IGetEventsParams, "calendarId">
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
      if (events.items) allEvents.push(...events.items);
    }
  }
  return allEvents;
};

export const getSlots = async (
  params: Omit<IGetEventsParams, "calendarId">
) => {
  const events = await getEventsFromAllCalendars(params);
  console.log("FINDING SLOTS FROM EVENTS", events);
};

const test = async () => {
  const result = await getSlots({});
  console.log("RESULT", result);
};

test();

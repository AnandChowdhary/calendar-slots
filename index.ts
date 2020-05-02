import { google } from "googleapis";
import {
  OAuth2Client,
  JWT,
  Compute,
  UserRefreshClient,
} from "google-auth-library";
import { config } from "dotenv";
config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DOCS_CLIENT_ID,
  process.env.GOOGLE_DOCS_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
const calendar = google.calendar("v3");

export interface IGetEventsParams {
  user?: {
    accessToken: string;
    refreshToken: string;
  };
  from?: Date;
  to?: Date;
  calendarId?: string;
  maxAttendees?: number;
  auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient;
  timeMax?: string;
  timeMin?: string;
  timeZone?: string;
}

/*
 * Find a user's events
 */
export const getEventsFromSingleCalendar = async ({
  user,
  from,
  to,
  calendarId,
  maxAttendees,
  auth,
  timeMax,
  timeMin,
  timeZone,
}: IGetEventsParams) => {
  oauth2Client.setCredentials({
    access_token: user?.accessToken || process.env.GOOGLE_DOCS_ACCESS,
    refresh_token: user?.refreshToken || process.env.GOOGLE_DOCS_REFRESH,
  });
  return calendar.events.list({
    timeMin: from?.toISOString(),
    timeMax: to?.toISOString(),
    auth: auth || oauth2Client,
    calendarId: calendarId || "primary",
    timeZone,
    maxResults: 3,
  });
};

export const getSlots = async () => true;

const test = async () => {
  const result = await getEventsFromSingleCalendar({});
  console.log("RESULT", result);
};
test();

import { google } from "googleapis";
import { config } from "dotenv";
config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DOCS_CLIENT_ID,
  process.env.GOOGLE_DOCS_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
const calendar = google.calendar("v3");

export const getSlots = async ({
  user,
}: {
  user?: {
    accessToken: string;
    refreshToken: string;
  };
}) => {
  oauth2Client.setCredentials({
    access_token: user?.accessToken || process.env.GOOGLE_DOCS_ACCESS,
    refresh_token: user?.refreshToken || process.env.GOOGLE_DOCS_REFRESH,
  });
  return true;
};

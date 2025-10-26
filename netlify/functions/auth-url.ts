import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.URL}/.netlify/functions/auth-callback`
);

export const handler: Handler = async () => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: authUrl }),
  };
};

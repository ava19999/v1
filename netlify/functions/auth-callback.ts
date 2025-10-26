import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.URL}/.netlify/functions/auth-callback`
);

export const handler: Handler = async (event) => {
  const { code } = event.queryStringParameters || {};

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No authorization code provided' }),
    };
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const userInfo = await oauth2.userinfo.get();
    const { email, name, picture } = userInfo.data;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: ${JSON.stringify({ email, name, picture })}
            }, window.location.origin);
            window.close();
          </script>
        </head>
        <body>
          <p>Authentication successful! You can close this window.</p>
        </body>
        </html>
      `,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to authenticate with Google' }),
    };
  }
};

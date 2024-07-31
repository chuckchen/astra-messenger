import { AwsClient } from 'aws4fetch';

let aws: AwsClient | null;

export default {
  async fetch(request, env, ctx) {
    // Check if the request is authenticated
    if (!isAuthenticated(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create an AwsClient instance
    if (aws === null) {
      aws = new AwsClient({
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        region: env.AWS_REGION,
        service: 'ses',
      });
    }
    const SES_ENDPOINT = `https://email.${env.AWS_REGION}.amazonaws.com/`;

    // Parse the request body
    const { to, from, subject, body } = await request.json<any>();

    // Validate input
    if (!to || !from || !subject || !body) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Prepare the SES request payload
    const payload = new URLSearchParams({
      Action: 'SendEmail',
      Source: from,
      'Destination.ToAddresses.member.1': to,
      'Message.Subject.Data': subject,
      'Message.Body.Text.Data': body,
    });

    try {
      // Send the email using SES
      const response = await aws.fetch(SES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(`Failed to send email: ${errorText}`, { status: response.status });
      }

      return new Response('Email sent successfully', { status: 200 });
    } catch (error: any) {
      return new Response(`Error sending email: ${error.message}`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

function isAuthenticated(request: any, env: any) {
  // Implement your authentication logic here
  // This could involve checking for a specific header, token, or integrating with Cloudflare Access
  const authToken = request.headers.get('X-Auth-Token');
  return authToken === env.API_AUTH_TOKEN; // Replace with your actual authentication logic
}

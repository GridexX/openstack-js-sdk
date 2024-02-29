import axios from 'axios';
import { z } from 'zod';

export const httpMethod = {
  GET: 'GET',
  POST: 'POST',
} as const;

export type HTTPMethod = (typeof httpMethod)[keyof typeof httpMethod];

// *
// * @param method The HTTP method to use
// * @param url The URL to call
// * @param token The token used for the authentication
// * @param requestSchema The schema to validate the Request type (see Zod)
// * @param responseSchema The schema to validate the Response (see Zod)
// * @returns data: The data received by the API, validated by the responseSchema.
export default function api<Request, Response>({
  method,
  url,
  token,
  requestSchema,
  responseSchema,
}: {
  method: HTTPMethod;
  url: string;
  token?: string;
  requestSchema?: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
}): (data: Request) => Promise<Response> {
  return function (requestData: Request) {
    if (requestSchema) {
      requestSchema.parse(requestData);
    }

    async function apiCall() {
      const response = await axios({
        method,
        url,
        headers: { 'X-Auth-Token': token },
        [method === httpMethod.GET ? 'params' : 'data']: requestData,

        // Validate the status to not reject the 300 HTTP code received from the API versions call
        validateStatus: function (status) {
          return status <= 300; // Reject only if the status code is greater than 300
        },
      });

      // Use Zod to validate the response
      responseSchema.safeParseAsync(response.data).then((result) => {
        if (!result.success) {
          console.error(`Wrong data received: ${JSON.stringify(response.data)}, error: ${result.error}`);
        }
      });

      return response.data as Response;
    }

    return apiCall();
  };
}

export function removeTrailingSlash(str: string) {
  if (str.endsWith('/')) {
    return str.slice(0, -1);
  }
  return str;
}

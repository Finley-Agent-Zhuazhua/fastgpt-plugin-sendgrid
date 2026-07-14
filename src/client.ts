import type { QueryDeliveryStatusInput, SendTemplateEmailInput } from './schemas';

export const SENDGRID_ORIGIN = 'https://api.sendgrid.com';
type JsonObject = Record<string, unknown>;

export class SendGridClient {
  constructor(private readonly apiKey: string, private readonly fetchFn: typeof fetch = fetch) {
    if (!apiKey.trim()) throw new Error('SendGrid apiKey secret is required');
  }

  async sendTemplateEmail(input: SendTemplateEmailInput): Promise<{ statusCode: number; messageId?: string }> {
    const response = await this.fetchFn(new URL('/v3/mail/send', SENDGRID_ORIGIN), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: input.to,
          dynamic_template_data: input.dynamicTemplateData
        }],
        from: input.from,
        template_id: input.templateId
      })
    });

    if (!response.ok) {
      const payload = await parsePayload(response, '/v3/mail/send');
      throw new Error(`SendGrid POST /v3/mail/send failed: ${errorMessage(payload, response.statusText)}`);
    }

    const messageId = response.headers.get('x-message-id') ?? undefined;
    return messageId ? { statusCode: response.status, messageId } : { statusCode: response.status };
  }

  async queryDeliveryStatus(input: QueryDeliveryStatusInput): Promise<{ messages: JsonObject[] }> {
    const url = new URL('/v3/messages', SENDGRID_ORIGIN);
    url.searchParams.set('limit', String(input.limit));
    if (input.query) url.searchParams.set('query', input.query);

    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json'
      }
    });
    const payload = await parsePayload(response, '/v3/messages');
    if (!response.ok) {
      throw new Error(`SendGrid GET /v3/messages failed: ${errorMessage(payload, response.statusText)}`);
    }

    const body = asObject(payload, 'Email Activity response');
    if (!Array.isArray(body.messages)) throw new Error('SendGrid Email Activity response messages must be an array');
    return { messages: body.messages.map((item) => asObject(item, 'Email Activity message')) };
  }
}

async function parsePayload(response: Response, path: string): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON from SendGrid ${path}`);
  }
}

function asObject(value: unknown, kind: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`SendGrid ${kind} must be an object`);
  return value as JsonObject;
}

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value) return value.slice(0, 500);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const body = value as JsonObject;
  if (typeof body.message === 'string') return body.message.slice(0, 500);
  if (Array.isArray(body.errors)) {
    const messages = body.errors
      .filter((item): item is JsonObject => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .map((item) => typeof item.message === 'string' ? item.message : '')
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ').slice(0, 500);
  }
  return fallback;
}

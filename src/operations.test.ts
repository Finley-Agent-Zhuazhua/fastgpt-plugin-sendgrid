import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryDeliveryStatus, sendTemplateEmail } from './operations';
import { queryDeliveryStatusInputSchema, secretSchema, sendTemplateEmailInputSchema } from './schemas';

const sendGridKey = ['SG', 'unit-test-placeholder'].join('.');
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

afterEach(() => vi.restoreAllMocks());

describe('schemas', () => {
  it('requires a SendGrid API key and validates dynamic templates', () => {
    expect(() => secretSchema.parse({ apiKey: 'not-a-sendgrid-key' })).toThrow(/SG/);
    expect(() => sendTemplateEmailInputSchema.parse({
      to: [{ email: 'person@example.com' }],
      from: { email: 'sender@example.com' },
      templateId: 'template-123',
      dynamicTemplateData: {}
    })).toThrow(/dynamic template ID/);
  });

  it('defaults delivery query limits', () => {
    expect(queryDeliveryStatusInputSchema.parse({}).limit).toBe(20);
    expect(secretSchema.parse({ apiKey: sendGridKey }).apiKey).toBe(sendGridKey);
  });
});

describe('SendGrid operations', () => {
  it('sends a dynamic template with bearer auth and JSON body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 202, { 'x-message-id': 'msg_123' }));
    await expect(sendTemplateEmail({
      apiKey: sendGridKey,
      to: [{ email: 'person@example.com', name: 'Ada' }],
      from: { email: 'sender@example.com', name: 'FastGPT' },
      templateId: 'd-template123',
      dynamicTemplateData: { firstName: 'Ada', orderId: 42 }
    })).resolves.toEqual({ success: true, accepted: true, statusCode: 202, messageId: 'msg_123' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${sendGridKey}`, 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual({
      personalizations: [{ to: [{ email: 'person@example.com', name: 'Ada' }], dynamic_template_data: { firstName: 'Ada', orderId: 42 } }],
      from: { email: 'sender@example.com', name: 'FastGPT' },
      template_id: 'd-template123'
    });
  });

  it('constructs a bounded activity query and parses messages', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ messages: [{ msg_id: 'msg_123', status: 'delivered' }] }));
    await expect(queryDeliveryStatus({ apiKey: sendGridKey, query: 'to_email="person@example.com"', limit: 5 })).resolves.toEqual({
      success: true,
      messages: [{ msg_id: 'msg_123', status: 'delivered' }],
      count: 1
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://api.sendgrid.com/v3/messages');
    expect(parsedUrl.searchParams.get('query')).toBe('to_email="person@example.com"');
    expect(parsedUrl.searchParams.get('limit')).toBe('5');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });

  it('reports API errors, malformed responses, and invalid JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ errors: [{ message: 'The provided API key is invalid' }] }, 401))
      .mockResolvedValueOnce(json({ messages: 'not-an-array' }))
      .mockResolvedValueOnce(new Response('not-json', { status: 502 }));

    await expect(sendTemplateEmail({
      apiKey: sendGridKey,
      to: [{ email: 'person@example.com' }],
      from: { email: 'sender@example.com' },
      templateId: 'd-template123',
      dynamicTemplateData: {}
    })).rejects.toThrow(/provided API key is invalid/);
    await expect(queryDeliveryStatus({ apiKey: sendGridKey, limit: 10 })).rejects.toThrow(/messages must be an array/);
    await expect(queryDeliveryStatus({ apiKey: sendGridKey, limit: 10 })).rejects.toThrow(/Invalid JSON/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

import { SendGridClient } from './client';
import type {
  QueryDeliveryStatusInput,
  QueryDeliveryStatusOutput,
  SendGridSecrets,
  SendTemplateEmailInput,
  SendTemplateEmailOutput
} from './schemas';

type WithSecrets<T> = T & SendGridSecrets;

export async function sendTemplateEmail(input: WithSecrets<SendTemplateEmailInput>): Promise<SendTemplateEmailOutput> {
  const result = await new SendGridClient(input.apiKey).sendTemplateEmail(input);
  return {
    success: true,
    accepted: result.statusCode === 202,
    statusCode: result.statusCode,
    ...(result.messageId ? { messageId: result.messageId } : {})
  };
}

export async function queryDeliveryStatus(input: WithSecrets<QueryDeliveryStatusInput>): Promise<QueryDeliveryStatusOutput> {
  const result = await new SendGridClient(input.apiKey).queryDeliveryStatus(input);
  return { success: true, messages: result.messages, count: result.messages.length };
}

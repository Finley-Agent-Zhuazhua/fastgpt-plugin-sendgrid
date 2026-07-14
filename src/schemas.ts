import type { InputSchemaMetaType, OutputSchemaMetaType, SecretSchemaMetaType } from '@fastgpt-plugin/sdk-factory';
import z from 'zod';

const text = (title: string, description: string, max = 2048) =>
  z.string().min(1).max(max).meta({ title, description, toolDescription: description } satisfies InputSchemaMetaType);

const optionalText = (title: string, description: string, max = 2048) =>
  z.string().max(max).optional().meta({ title, description, toolDescription: description } satisfies InputSchemaMetaType);

const email = (title: string, description: string) =>
  z.string().min(3).max(320).email().meta({ title, description, toolDescription: description } satisfies InputSchemaMetaType);

const recipientSchema = z.object({
  email: email('Recipient email', 'Recipient email address.'),
  name: optionalText('Recipient name', 'Optional recipient display name.', 256)
});

const senderSchema = z.object({
  email: email('Sender email', 'Verified sender email address configured in SendGrid.'),
  name: optionalText('Sender name', 'Optional sender display name.', 256)
});

const dynamicTemplateData = z.record(z.string().max(256), z.unknown()).default({}).meta({
  title: 'Dynamic template data',
  description: 'Variables referenced by the SendGrid dynamic template.',
  toolDescription: 'JSON object of dynamic template variables.'
} satisfies InputSchemaMetaType);

export const secretSchema = z.object({
  apiKey: z.string().min(1).max(1024).regex(/^SG\.[A-Za-z0-9._-]+$/, 'must be a SendGrid API key beginning with SG.').meta({
    title: 'SendGrid API key',
    description: 'SendGrid API key with only the Mail Send and Email Activity scopes required by the selected tools.',
    isSecret: true
  } satisfies SecretSchemaMetaType)
});

export const sendTemplateEmailInputSchema = z.object({
  to: z.array(recipientSchema).min(1).max(100).meta({
    title: 'Recipients',
    description: 'One or more recipient email addresses.',
    toolDescription: 'Recipients for this email.'
  } satisfies InputSchemaMetaType),
  from: senderSchema.meta({
    title: 'Sender',
    description: 'Verified SendGrid sender identity.',
    toolDescription: 'Verified sender address.'
  } satisfies InputSchemaMetaType),
  templateId: text('Dynamic template ID', 'SendGrid dynamic template ID beginning with d-.', 128).regex(/^d-[A-Za-z0-9]+$/, 'must be a SendGrid dynamic template ID beginning with d-'),
  dynamicTemplateData
});

export const queryDeliveryStatusInputSchema = z.object({
  query: optionalText('Activity query', 'Optional SendGrid Email Activity query, for example status="delivered" or to_email="user@example.com".', 5000),
  limit: z.number().int().min(1).max(1000).default(20).meta({
    title: 'Limit',
    description: 'Maximum number of activity messages to return (1-1000).',
    toolDescription: 'Maximum messages to return.'
  } satisfies InputSchemaMetaType)
});

const success = z.literal(true).meta({ title: 'Success' } satisfies OutputSchemaMetaType);
const messageObject = z.record(z.string(), z.unknown());

export const sendTemplateEmailOutputSchema = z.object({
  success,
  accepted: z.boolean().meta({ title: 'Accepted' } satisfies OutputSchemaMetaType),
  statusCode: z.number().int().meta({ title: 'HTTP status' } satisfies OutputSchemaMetaType),
  messageId: z.string().optional().meta({ title: 'Message ID' } satisfies OutputSchemaMetaType)
});

export const queryDeliveryStatusOutputSchema = z.object({
  success,
  messages: z.array(messageObject).meta({ title: 'Messages' } satisfies OutputSchemaMetaType),
  count: z.number().int().nonnegative().meta({ title: 'Count' } satisfies OutputSchemaMetaType)
});

export type SendGridSecrets = z.output<typeof secretSchema>;
export type SendTemplateEmailInput = z.output<typeof sendTemplateEmailInputSchema>;
export type QueryDeliveryStatusInput = z.output<typeof queryDeliveryStatusInputSchema>;
export type SendTemplateEmailOutput = z.output<typeof sendTemplateEmailOutputSchema>;
export type QueryDeliveryStatusOutput = z.output<typeof queryDeliveryStatusOutputSchema>;

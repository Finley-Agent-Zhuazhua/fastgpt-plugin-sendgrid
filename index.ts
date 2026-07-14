import { createToolHandler, defineToolSet } from '@fastgpt-plugin/sdk-factory';
import {
  queryDeliveryStatus,
  sendTemplateEmail
} from './src/operations';
import {
  queryDeliveryStatusInputSchema,
  queryDeliveryStatusOutputSchema,
  secretSchema,
  sendTemplateEmailInputSchema,
  sendTemplateEmailOutputSchema,
  type SendGridSecrets
} from './src/schemas';

function requireSecrets(secrets: SendGridSecrets | undefined): SendGridSecrets {
  const parsed = secretSchema.safeParse(secrets);
  if (!parsed.success) throw new Error('SendGrid apiKey secret is required');
  return parsed.data;
}

const sendTemplateEmailHandler = createToolHandler({
  inputSchema: sendTemplateEmailInputSchema,
  outputSchema: sendTemplateEmailOutputSchema,
  secretSchema,
  handler: async (input, ctx) => sendTemplateEmail({ ...input, ...requireSecrets(ctx.secrets) })
});

const queryDeliveryStatusHandler = createToolHandler({
  inputSchema: queryDeliveryStatusInputSchema,
  outputSchema: queryDeliveryStatusOutputSchema,
  secretSchema,
  handler: async (input, ctx) => queryDeliveryStatus({ ...input, ...requireSecrets(ctx.secrets) })
});

export default defineToolSet({
  manifest: {
    pluginId: 'sendgrid',
    name: { en: 'SendGrid', 'zh-CN': 'SendGrid' },
    description: {
      en: 'Send template emails and inspect SendGrid delivery activity.',
      'zh-CN': '发送模板邮件并查询 SendGrid 投递活动状态。'
    },
    version: '0.1.0',
    versionDescription: {
      en: 'Initial template email and delivery activity tools.',
      'zh-CN': '初始模板邮件发送与投递活动查询工具。'
    },
    toolDescription: 'Use a SendGrid API key to send dynamic-template email and inspect read-only email activity. The API key is never returned.',
    tutorialUrl: 'https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send',
    tags: ['tools', 'communication'],
    permission: []
  },
  secretSchema,
  children: [
    {
      id: 'sendTemplateEmail',
      name: { en: 'Send Template Email', 'zh-CN': '发送模板邮件' },
      description: {
        en: 'Send an email using a SendGrid dynamic template.',
        'zh-CN': '使用 SendGrid 动态模板发送邮件。'
      },
      toolDescription: 'Send one dynamic-template email to one or more recipients. The template must be a SendGrid dynamic template ID beginning with d-.',
      handler: sendTemplateEmailHandler
    },
    {
      id: 'queryDeliveryStatus',
      name: { en: 'Query Delivery Status', 'zh-CN': '查询投递状态' },
      description: {
        en: 'Search read-only SendGrid email activity and delivery events.',
        'zh-CN': '查询只读 SendGrid 邮件活动和投递事件。'
      },
      toolDescription: 'Search SendGrid Email Activity by its query syntax and return message delivery statuses. Email Activity access may depend on the SendGrid plan.',
      handler: queryDeliveryStatusHandler
    }
  ]
});

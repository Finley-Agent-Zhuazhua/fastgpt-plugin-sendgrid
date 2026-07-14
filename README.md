# SendGrid for FastGPT

SendGrid tool suite for sending dynamic-template email and inspecting read-only email activity from FastGPT.

## Tools

- **Send Template Email**: send an email to one or more recipients with a SendGrid dynamic template and template variables.
- **Query Delivery Status**: search SendGrid Email Activity messages using its query syntax and return delivery status/events.

The plugin uses the fixed SendGrid API host `https://api.sendgrid.com`. It does not accept arbitrary hosts, and it never creates or modifies delivery records. Email Activity availability can depend on the SendGrid account plan.

## Secrets

Configure one FastGPT secret:

- `apiKey`: a SendGrid API key beginning with `SG.`. Grant only the Mail Send and Email Activity read scopes needed by your workflow. The key is sent only in the `Authorization: Bearer` header and is never returned in tool output.

The sender address must be a verified SendGrid sender identity. Dynamic templates must use a template ID beginning with `d-`.

## Examples

Send a template email:

```json
{
  "to": [{ "email": "person@example.com", "name": "Ada" }],
  "from": { "email": "verified@example.com", "name": "FastGPT" },
  "templateId": "d-123abc456def",
  "dynamicTemplateData": { "firstName": "Ada", "ticketId": "T-100" }
}
```

Search delivered messages for a recipient:

```json
{
  "query": "to_email=\"person@example.com\" AND status=\"delivered\"",
  "limit": 20
}
```

## Local verification

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm type-check
corepack pnpm build
corepack pnpm check
corepack pnpm pack
```

Tests mock `fetch` and cover request construction, authorization headers, response parsing, validation, malformed responses, and API error paths. No live SendGrid credential integration test was performed.

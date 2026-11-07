# Lead Generator

A powerful CLI tool and Node.js module for sending mass lead emails with AI-powered personalization and automated voice cold-calling. Built for sales teams who want to scale their outreach while maintaining personalization and professionalism.

## Features

- 📧 **Mass Email Campaigns** - Send personalized emails to hundreds of leads
- 📞 **Voice AI Cold-calling** - Automated cold calling with Bland.ai integration
- 🤖 **AI Personalization** - template customization on c0mpute, with OpenAI as the fallback
- 📊 **CSV Processing** - Import leads from CSV files with validation
- 🎯 **Smart Templates** - 10 pre-built sales email templates
- 📈 **Batch Processing** - Configurable batch sizes with rate limiting
- 🔍 **Email Validation** - Comprehensive lead data validation
- 🎣 **Webhook Server** - Real-time call outcome processing with Hono.js
- 🎛️ **IVR System** - Press 1 for Calendly, Press 2 to opt-out
- 🛠️ **CLI & Module** - Use as command-line tool or Node.js module

## Installation

### Using pnpm (recommended)
```bash
pnpm install @profullstack/lead-generator
```

### Using npm
```bash
npm install @profullstack/lead-generator
```

### Global Installation (for CLI usage)
```bash
pnpm install -g @profullstack/lead-generator
```

## Quick Start

### 1. Environment Setup

Create a `.env` file with your API keys:

```bash
# Mailgun Configuration (Required for email campaigns)
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_mailgun_domain_here

# AI personalization runs on c0mpute first (no key needed: 10 free calls a day;
# an Infernet account key ik_live_... lifts that). C0MPUTE_DISABLED=1 turns it off.
C0MPUTE_API_KEY=your_infernet_account_key
# c0mpute is slow: 60 to 240 s per lead is normal. Whole-call cap:
C0MPUTE_TIMEOUT_MS=300000

# OpenAI (fallback when c0mpute fails)
OPENAI_API_KEY=your_openai_api_key_here

# Bland.ai Configuration (Required for voice calling)
BLAND_AI_API_KEY=your_bland_ai_api_key_here
VOICE_WEBHOOK_PORT=3001
VOICE_WEBHOOK_URL=https://your-domain.com/webhook

# SMS & Calendly Configuration (Optional)
SMS_SERVICE_API_KEY=your_sms_api_key_here
CALENDLY_LINK=https://calendly.com/your-meeting-link

# Sender Information
DEFAULT_FROM_EMAIL=your_name@your_domain.com
DEFAULT_FROM_NAME=Your Name
```

### 2. Prepare Your CSV File

Your CSV file should include these columns:
- `FirstName` (required)
- `LastName` (optional)
- `Company` (required)
- `WorkEmail` (required if PersonalEmail not provided)
- `PersonalEmail` (required if WorkEmail not provided)
- `Phone` (optional, for future voice features)
- `Industry` (optional, helps with personalization)
- `Title` (optional, helps with personalization)

Example CSV:
```csv
FirstName,LastName,Company,WorkEmail,PersonalEmail,Phone,Industry,Title
John,Doe,Acme Corp,john.doe@acme.com,john@personal.com,555-0123,Technology,CTO
Jane,Smith,Beta Inc,jane.smith@beta.com,,555-0456,Healthcare,VP Engineering
```

### 3. Send Your First Campaign

```bash
# Using CLI
lead-generator send leads.csv --template expansion --sender-name "Your Name"

# Or using the short alias
lg send leads.csv -t expansion
```

## CLI Usage

### Commands

#### Send Campaign
```bash
lead-generator send <csv-file> [options]

Options:
  --template, -t          Template ID or "random" (default: "random")
  --sender-name          Sender name
  --sender-email         Sender email
  --sender-title         Sender title (default: "Sales Director")
  --batch-size           Emails per batch (default: 300)
  --delay                Delay between batches in ms (default: 1000)
  --dry-run              Simulate without sending (default: false)
  --ai-personalization   Enable AI personalization (default: true)
  --output, -o           Save results to file
```

#### List Templates
```bash
lead-generator templates [options]

Options:
  --category, -c         Filter by category
  --tone                 Filter by tone
  --details, -d          Show template details
```

#### Validate CSV
```bash
lead-generator validate <csv-file> [options]

Options:
  --output, -o           Save validation report to file
```

#### Voice AI Cold-calling
```bash
# Start cold-calling campaign
lead-generator coldcall run <csv-file> [options]

Options:
  --script               Voice script template (default: "default")
  --batch-size          Number of calls per batch (default: 10)
  --delay               Delay between calls in seconds (default: 30)
  --dry-run             Simulate calling without making actual calls
  --output, -o          Save campaign results to file

# Check campaign status
lead-generator coldcall status [options]

Options:
  --campaign-id         Specific campaign ID to check
  --detailed, -d        Show detailed status information

# Generate call reports
lead-generator coldcall report [options]

Options:
  --campaign-id         Specific campaign ID to report on
  --output, -o          Output file for report (default: "call-report.csv")
  --format              Report format: csv or json (default: "csv")
```

### Examples

```bash
# Send email campaign with specific template
lead-generator send leads.csv --template problem-solver --dry-run

# Start voice calling campaign
lead-generator coldcall run contacts.csv --batch-size 5 --delay 45

# Check status of specific campaign
lead-generator coldcall status --campaign-id abc123 --detailed

# Generate detailed call report
lead-generator coldcall report --format json --output call-results.json

# List all templates with details
lead-generator templates --details

# Validate CSV file
lead-generator validate leads.csv --output validation-report.json

# Send campaign and save results
lead-generator send leads.csv -t expansion -o campaign-results.json
```

## Voice AI Cold-calling

### Quick Start

```bash
# 1. Prepare CSV with phone numbers
# Required columns: Name, PhoneNumber, Email (optional)

# 2. Start cold-calling campaign
lead-generator coldcall run contacts.csv

# 3. Monitor campaign progress
lead-generator coldcall status

# 4. Generate detailed reports
lead-generator coldcall report --format json
```

### CSV Format for Voice Calling

Your CSV file should include these columns for voice campaigns:
- `Name` (required) - Contact's full name
- `PhoneNumber` (required) - Phone number in international format (+1234567890)
- `Email` (optional) - For follow-up emails
- `Company` (optional) - Company name for personalization

Example CSV:
```csv
Name,PhoneNumber,Email,Company
John Doe,+1234567890,john@acme.com,Acme Corp
Jane Smith,+1987654321,jane@beta.com,Beta Inc
Bob Johnson,+1555123456,bob@gamma.com,Gamma LLC
```

### IVR System

The voice AI includes an interactive voice response (IVR) system:

- **Press 1**: Interested in learning more
  - Automatically sends SMS with Calendly link
  - Logs as "scheduled meeting" in analytics
  
- **Press 2**: Not interested / Opt out
  - Adds contact to do-not-call list
  - Logs as "opted out" in analytics

### Webhook Server

The system includes a Hono.js webhook server that:

- **Receives real-time callbacks** from Bland.ai when calls complete
- **Processes IVR responses** automatically (Press 1/2 handling)
- **Sends SMS messages** with Calendly links for interested prospects
- **Manages do-not-call lists** for opt-outs
- **Generates analytics** and call statistics
- **Logs all call outcomes** to JSON files

#### Webhook Endpoints

- `POST /webhook` - Main Bland.ai callback endpoint
- `GET /health` - Health check
- `GET /logs` - Retrieve call logs
- `GET /stats` - Get call statistics
- `DELETE /logs` - Clear logs (testing)

### Voice Campaign Analytics

Track comprehensive metrics:

- **Answer Rate**: Percentage of calls answered
- **Conversion Rate**: Percentage who pressed 1 (interested)
- **Opt-out Rate**: Percentage who pressed 2
- **Average Call Duration**: Mean call length
- **Campaign ROI**: Cost per interested prospect

Example analytics output:
```json
{
  "total": 100,
  "answered": 65,
  "scheduledMeetings": 12,
  "optedOut": 8,
  "answerRate": "65.00%",
  "conversionRate": "18.46%",
  "averageDuration": 45
}
```

## Node.js Module Usage

### Basic Usage

```javascript
import { LeadGenerator } from '@profullstack/lead-generator';

const generator = new LeadGenerator({
  mailgunApiKey: 'your-api-key',
  mailgunDomain: 'your-domain.com',
  openaiApiKey: 'your-openai-key',
  senderName: 'Your Name',
  senderEmail: 'you@company.com'
});

// Run complete campaign
const results = await generator.runCampaign('leads.csv', {
  templateId: 'expansion',
  dryRun: false
});

console.log(`Sent ${results.sending.successful} emails`);
```

### Quick Start Function

```javascript
import { quickStart } from '@profullstack/lead-generator';

const results = await quickStart('leads.csv', {
  mailgunApiKey: 'your-api-key',
  mailgunDomain: 'your-domain.com',
  senderName: 'Your Name',
  senderEmail: 'you@company.com',
  templateId: 'social-proof'
});
```

### Voice AI Module Usage

```javascript
import { BlandAIService, startWebhookServer } from '@profullstack/lead-generator';

// Initialize Bland.ai service
const blandService = new BlandAIService({
  apiKey: 'your-bland-ai-key',
  webhookUrl: 'https://your-domain.com/webhook'
});

// Start webhook server
const webhookServer = await startWebhookServer({
  port: 3001,
  calendlyLink: 'https://calendly.com/your-meeting'
});

// Process contacts for calling
const { validLeads } = await processLeadsFromCSV('contacts.csv', {
  requirePhone: true
});

// Start call campaign
const campaign = await blandService.startCallCampaign(validLeads, {
  batchSize: 10,
  delay: 30000, // 30 seconds between calls
  script: 'default'
});

console.log(`Campaign ${campaign.campaignId} started with ${campaign.totalCalls} calls`);

// Check campaign status
const status = await blandService.getCampaignStatus(campaign.campaignId);
console.log(`Campaign status: ${status.status}, completed: ${status.completed}`);

// Generate report
const report = await blandService.generateCampaignReport(campaign.campaignId);
console.log(`Answer rate: ${report.answerRate}%, Conversion rate: ${report.conversionRate}%`);
```

### Webhook Server Usage

```javascript
import { WebhookServer } from '@profullstack/lead-generator';

// Create webhook server
const server = new WebhookServer({
  port: 3001,
  logFile: './logs/call-outcomes.json',
  calendlyLink: 'https://calendly.com/your-meeting',
  smsApiKey: 'your-sms-api-key'
});

// Start server
await server.start();
console.log('Webhook server running on port 3001');

// Access call logs
const logs = server.callLogs;
console.log(`Total calls logged: ${logs.length}`);

// Get statistics
const stats = server.generateStats();
console.log(`Answer rate: ${stats.answerRate}%`);
console.log(`Conversion rate: ${stats.conversionRate}%`);

// Stop server when done
await server.stop();
```

### Individual Module Usage

```javascript
import {
  processLeadsFromCSV,
  personalizeTemplate,
  sendBatchEmails,
  getTemplateById,
  BlandAIService,
  WebhookServer
} from '@profullstack/lead-generator';

// Process CSV for email campaigns
const { validLeads } = await processLeadsFromCSV('leads.csv');

// Process CSV for voice campaigns (requires phone numbers)
const { validLeads: voiceLeads } = await processLeadsFromCSV('contacts.csv', {
  requirePhone: true
});

// Get template
const template = getTemplateById('expansion');

// Personalize emails
const personalizedEmails = await batchPersonalize(
  [template],
  validLeads,
  { name: 'Your Name', email: 'you@company.com' }
);

// Send emails
const emailResults = await sendBatchEmails(emailsToSend, {
  apiKey: 'your-mailgun-key',
  domain: 'your-domain.com'
});

// Make voice calls
const blandService = new BlandAIService({ apiKey: 'your-bland-ai-key' });
const callResults = await blandService.startCallCampaign(voiceLeads, {
  batchSize: 5,
  delay: 45000
});
```

## Available Templates

| ID | Name | Category | Tone | Use Case |
|----|------|----------|------|----------|
| `expansion` | Team Expansion Focus | growth | professional | When prospect is expanding |
| `problem-solver` | Problem Solver | solution | consultative | Addressing pain points |
| `social-proof` | Social Proof | social-proof | confident | Leveraging success stories |
| `curiosity` | Curiosity Gap | curiosity | intriguing | Creating intrigue |
| `direct` | Direct Value Prop | direct | straightforward | Clear value proposition |
| `question` | Question-Based | engagement | conversational | Engaging with questions |
| `referral` | Referral/Connection | referral | warm | Mutual connections |
| `urgency` | Urgency/Scarcity | urgency | urgent | Time-sensitive offers |
| `insight` | Industry Insight | insight | informative | Sharing insights |
| `follow-up` | Follow-up | follow-up | respectful | Re-engagement |

## Configuration

### Environment Variables

```bash
# Mailgun Configuration (Email Campaigns)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_BASE_URL=https://api.mailgun.net

# AI Personalization: c0mpute first, OpenAI fallback
C0MPUTE_API_KEY=your_infernet_account_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Bland.ai Configuration (Voice Calling)
BLAND_AI_API_KEY=your_bland_ai_api_key
BLAND_AI_BASE_URL=https://api.bland.ai
VOICE_WEBHOOK_PORT=3001
VOICE_WEBHOOK_URL=https://your-domain.com/webhook

# Call Configuration
CALL_BATCH_SIZE=10
CALL_DELAY_SECONDS=30
CALL_HOURS_START=9
CALL_HOURS_END=17
CALL_TIMEZONE=America/New_York

# SMS & Calendly Configuration
SMS_SERVICE_API_KEY=your_sms_api_key
CALENDLY_LINK=https://calendly.com/your-meeting-link

# Email Configuration
DEFAULT_FROM_EMAIL=your_email@domain.com
DEFAULT_FROM_NAME=Your Name
DEFAULT_REPLY_TO=your_reply@domain.com

# Batch Processing
BATCH_SIZE=300
BATCH_DELAY_MS=1000
MAX_RETRIES=3

# Features
PERSONALIZATION_ENABLED=true
DRY_RUN=false
```

### Programmatic Configuration

```javascript
const generator = new LeadGenerator({
  // Mailgun settings
  mailgunApiKey: 'your-key',
  mailgunDomain: 'your-domain.com',
  
  // OpenAI settings
  openaiApiKey: 'your-key',
  openaiModel: 'gpt-4',
  
  // Sender info
  senderName: 'Your Name',
  senderEmail: 'you@company.com',
  senderTitle: 'Sales Director',
  
  // Campaign settings
  batchSize: 100,
  delay: 2000,
  enablePersonalization: true,
  trackOpens: true,
  trackClicks: true
});
```

## API Reference

### LeadGenerator Class

#### Constructor
```javascript
new LeadGenerator(config)
```

#### Methods
- `runCampaign(csvFilePath, options)` - Run complete campaign
- `validateConfig()` - Validate configuration
- `getTemplates(filters)` - Get available templates
- `previewEmail(templateId, leadData)` - Preview personalized email

### Functions

- `quickStart(csvFilePath, config)` - Quick campaign setup
- `processLeadsFromCSV(filePath)` - Process CSV file
- `personalizeTemplate(template, leadData, senderInfo)` - Personalize single template
- `sendBatchEmails(emails, options)` - Send email batch
- `getTemplateById(id)` - Get template by ID

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run specific test files
pnpm test:csv
pnpm test:email
pnpm test:ai

# Run with coverage
pnpm test --coverage
```

## Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/profullstack/lead-generator.git
cd lead-generator

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
```

### Project Structure

```
lead-generator/
├── bin/
│   └── lead-generator.js     # CLI entry point
├── src/
│   ├── templates/            # Email templates
│   ├── csv-parser.js         # CSV processing
│   ├── ai-service.js         # AI personalization (c0mpute, OpenAI fallback)
│   ├── email-service.js      # Mailgun integration
│   └── voice-service.js      # Voice AI stub
├── test/                     # Test files
├── index.js                  # Main module export
└── package.json
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement the feature
5. Run tests and ensure they pass
6. Submit a pull request

## Troubleshooting

### Common Issues

**"Mailgun API key is required"**
- Ensure `MAILGUN_API_KEY` is set in your `.env` file
- Verify the API key is correct in your Mailgun dashboard

**"No valid leads found"**
- Check your CSV file format
- Ensure required columns (`FirstName`, `Company`) are present
- Verify at least one email field (`WorkEmail` or `PersonalEmail`) has valid data

**"Rate limit exceeded"**
- Increase the delay between batches with `--delay` option
- Reduce batch size with `--batch-size` option
- Check your Mailgun sending limits

**AI personalization fails**
- Verify `OPENAI_API_KEY` is set correctly
- Check your OpenAI account has sufficient credits
- Use `--ai-personalization false` to disable AI features

### Debug Mode

Enable verbose logging:

```bash
lead-generator send leads.csv --verbose
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@profullstack.com
- 🐛 Issues: [GitHub Issues](https://github.com/profullstack/lead-generator/issues)
- 📖 Documentation: [Full Documentation](https://profullstack.com/docs/lead-generator)

## Roadmap

- [ ] Voice AI implementation with Twilio
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Advanced analytics and reporting
- [ ] A/B testing for templates
- [ ] Webhook support for email events
- [ ] Template builder UI
- [ ] Multi-language support
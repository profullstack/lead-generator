/**
 * CLI Setup Command
 * Interactive configuration setup for lead generator
 */

import inquirer from 'inquirer';
import {
  getDefaultConfig,
  saveConfig,
  validateConfig,
  mergeConfig
} from './config-manager.js';

/**
 * Run the interactive setup command
 * @param {string} [configPath] - Optional custom config path
 * @returns {Promise<object>} Result with success flag and optional error
 */
export async function runSetupCommand(configPath) {
  try {
    console.log('🚀 Lead Generator Configuration Setup');
    console.log('=====================================\n');
    console.log('This setup will help you configure your lead generator with API keys and settings.\n');

    // Prompt for configuration
    const config = await promptForConfig();

    // Display summary
    console.log('\n');
    displayConfigSummary(config);

    // Confirm save
    const shouldSave = await confirmSaveConfig();
    
    if (!shouldSave) {
      console.log('\n❌ Setup cancelled. Configuration not saved.');
      return { success: false, cancelled: true };
    }

    // Save configuration
    const saveResult = saveConfig(config, configPath);
    
    if (!saveResult.success) {
      console.error(`\n❌ ${saveResult.error}`);
      return { success: false, error: saveResult.error };
    }

    console.log('\n✅ Configuration saved successfully!');
    console.log(`📁 Config file: ${configPath || 'default location'}`);
    console.log('\nYou can now use the lead generator commands. Run with --help for available options.');
    
    return { success: true };
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Prompt user for configuration values
 * @returns {Promise<object>} Configuration object
 */
export async function promptForConfig() {
  const defaultConfig = getDefaultConfig();

  console.log('📧 Email Configuration (Mailgun)');
  console.log('--------------------------------');

  const emailAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'mailgunApiKey',
      message: 'Mailgun API Key:',
      validate: (input) => input.trim() ? true : 'Mailgun API key is required'
    },
    {
      type: 'input',
      name: 'mailgunDomain',
      message: 'Mailgun Domain:',
      validate: (input) => input.trim() ? true : 'Mailgun domain is required'
    },
    {
      type: 'input',
      name: 'emailFrom',
      message: 'From Email Address (optional):',
      validate: (input) => {
        if (!input.trim()) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) ? true : 'Please enter a valid email address';
      }
    },
    {
      type: 'input',
      name: 'emailReplyTo',
      message: 'Reply-To Email Address (optional):',
      validate: (input) => {
        if (!input.trim()) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) ? true : 'Please enter a valid email address';
      }
    },
    {
      type: 'number',
      name: 'emailBatchSize',
      message: 'Email Batch Size:',
      default: defaultConfig.email.batchSize,
      validate: (input) => input > 0 ? true : 'Batch size must be greater than 0'
    }
  ]);

  console.log('\n🤖 AI Configuration (c0mpute first, OpenAI fallback)');
  console.log('----------------------------');

  const aiAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'openaiApiKey',
      message: 'OpenAI API Key (fallback; leave blank to use c0mpute only):'
    },
    {
      type: 'list',
      name: 'openaiModel',
      message: 'OpenAI Model:',
      choices: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      default: defaultConfig.ai.openai.model
    }
  ]);

  console.log('\n📞 Voice Configuration (Bland.ai)');
  console.log('----------------------------------');

  const voiceAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'blandaiApiKey',
      message: 'Bland.ai API Key (optional):',
    },
    {
      type: 'input',
      name: 'blandaiPhoneNumber',
      message: 'Bland.ai Phone Number (optional):',
      validate: (input) => {
        if (!input.trim()) return true;
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(input) ? true : 'Please enter a valid phone number';
      }
    },
    {
      type: 'number',
      name: 'voiceBatchSize',
      message: 'Voice Call Batch Size:',
      default: defaultConfig.voice.batchSize,
      validate: (input) => input > 0 ? true : 'Batch size must be greater than 0'
    }
  ]);

  console.log('\n📱 SMS Configuration (Twilio)');
  console.log('-----------------------------');

  const smsAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'twilioAccountSid',
      message: 'Twilio Account SID (optional):',
    },
    {
      type: 'input',
      name: 'twilioAuthToken',
      message: 'Twilio Auth Token (optional):',
    },
    {
      type: 'input',
      name: 'twilioFromNumber',
      message: 'Twilio From Phone Number (optional):',
      validate: (input) => {
        if (!input.trim()) return true;
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(input) ? true : 'Please enter a valid phone number';
      }
    },
    {
      type: 'number',
      name: 'smsBatchSize',
      message: 'SMS Batch Size:',
      default: defaultConfig.sms?.batchSize || 50,
      validate: (input) => input > 0 ? true : 'Batch size must be greater than 0'
    }
  ]);

  console.log('\n� Webhook Configuration');
  console.log('------------------------');

  const webhookAnswers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'webhooksEnabled',
      message: 'Enable webhook server?',
      default: defaultConfig.webhooks.enabled
    },
    {
      type: 'number',
      name: 'webhooksPort',
      message: 'Webhook server port:',
      default: defaultConfig.webhooks.port,
      when: (answers) => answers.webhooksEnabled,
      validate: (input) => {
        if (input < 1 || input > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return true;
      }
    }
  ]);

  // Merge all answers into configuration object
  const config = mergeConfig(defaultConfig, {
    email: {
      mailgun: {
        apiKey: emailAnswers.mailgunApiKey,
        domain: emailAnswers.mailgunDomain
      },
      from: emailAnswers.emailFrom || '',
      replyTo: emailAnswers.emailReplyTo || '',
      batchSize: emailAnswers.emailBatchSize
    },
    ai: {
      openai: {
        apiKey: aiAnswers.openaiApiKey,
        model: aiAnswers.openaiModel
      }
    },
    voice: {
      blandAI: {
        apiKey: voiceAnswers.blandaiApiKey || '',
        phoneNumber: voiceAnswers.blandaiPhoneNumber || ''
      },
      batchSize: voiceAnswers.voiceBatchSize
    },
    sms: {
      twilio: {
        accountSid: smsAnswers.twilioAccountSid || '',
        authToken: smsAnswers.twilioAuthToken || '',
        phoneNumber: smsAnswers.twilioFromNumber || ''
      },
      batchSize: smsAnswers.smsBatchSize
    },
    webhooks: {
      enabled: webhookAnswers.webhooksEnabled,
      port: webhookAnswers.webhooksPort || defaultConfig.webhooks.port
    }
  });

  return config;
}

/**
 * Display configuration summary
 * @param {object} config - Configuration object to display
 */
export function displayConfigSummary(config) {
  console.log('📋 Configuration Summary');
  console.log('========================\n');

  console.log('📧 Email Settings:');
  console.log(`   Mailgun API Key: ${maskApiKey(config.email.mailgun.apiKey)}`);
  console.log(`   Mailgun Domain: ${config.email.mailgun.domain}`);
  console.log(`   From Email: ${config.email.from || '(not set)'}`);
  console.log(`   Reply-To Email: ${config.email.replyTo || '(not set)'}`);
  console.log(`   Batch Size: ${config.email.batchSize}`);

  console.log('\n🤖 AI Settings:');
  console.log(`   OpenAI API Key: ${maskApiKey(config.ai.openai.apiKey)}`);
  console.log(`   OpenAI Model: ${config.ai.openai.model}`);

  console.log('\n📞 Voice Settings:');
  console.log(`   Bland.ai API Key: ${config.voice?.blandAI?.apiKey ? maskApiKey(config.voice.blandAI.apiKey) : '(not set)'}`);
  console.log(`   Bland.ai Phone: ${config.voice?.blandAI?.phoneNumber || '(not set)'}`);
  console.log(`   Batch Size: ${config.voice?.batchSize || 'N/A'}`);

  console.log('\n📱 SMS Settings:');
  console.log(`   Twilio Account SID: ${config.sms?.twilio?.accountSid ? maskApiKey(config.sms.twilio.accountSid) : '(not set)'}`);
  console.log(`   Twilio Auth Token: ${config.sms?.twilio?.authToken ? maskApiKey(config.sms.twilio.authToken) : '(not set)'}`);
  console.log(`   Twilio Phone: ${config.sms?.twilio?.phoneNumber || '(not set)'}`);
  console.log(`   Batch Size: ${config.sms?.batchSize || 'N/A'}`);

  console.log('\n� Webhook Settings:');
  console.log(`   Enabled: ${config.webhooks?.enabled ? 'Yes' : 'No'}`);
  if (config.webhooks?.enabled) {
    console.log(`   Port: ${config.webhooks.port}`);
  }
}

/**
 * Confirm with user before saving configuration
 * @returns {Promise<boolean>} True if user confirms
 */
export async function confirmSaveConfig() {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Save this configuration?',
      default: true
    }
  ]);

  return answer.confirm;
}

/**
 * Mask API key for display (show first 6 chars + ***)
 * @param {string} apiKey - API key to mask
 * @returns {string} Masked API key
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 6) {
    return '***';
  }
  return `${apiKey.substring(0, 6)}***`;
}
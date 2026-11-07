/**
 * Configuration Manager
 * Handles user configuration for lead generator
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { isC0mputeDisabled } from './c0mpute.js';

/**
 * Get the path to the configuration file
 * @returns {string} Full path to config.json
 */
export function getConfigPath() {
  return path.join(os.homedir(), '.config', 'lead-generator', 'config.json');
}

/**
 * Get default configuration structure
 * @returns {object} Default configuration object
 */
export function getDefaultConfig() {
  return {
    email: {
      mailgun: {
        apiKey: '',
        domain: ''
      },
      from: '',
      replyTo: '',
      batchSize: 100,
      delayBetweenEmails: 1000
    },
    voice: {
      blandAI: {
        apiKey: '',
        phoneNumber: ''
      },
      batchSize: 50,
      delayBetweenCalls: 5000,
      maxCallDuration: 300
    },
    ai: {
      openai: {
        apiKey: '',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7
      }
    },
    general: {
      retryAttempts: 3,
      timeout: 30000,
      logLevel: 'info',
      batchSize: 100
    },
    webhooks: {
      port: 3000,
      enabled: false
    }
  };
}

/**
 * Validate configuration object
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result with valid flag and errors array
 */
export function validateConfig(config) {
  const errors = [];

  // Check required fields
  if (!config?.email?.mailgun?.apiKey || config.email.mailgun.apiKey.trim() === '') {
    errors.push('Mailgun API key is required');
  }

  if (!config?.email?.mailgun?.domain || config.email.mailgun.domain.trim() === '') {
    errors.push('Mailgun domain is required');
  }

  // c0mpute needs no key, so OpenAI is only required when c0mpute is off
  if (isC0mputeDisabled() && (!config?.ai?.openai?.apiKey || config.ai.openai.apiKey.trim() === '')) {
    errors.push('OpenAI API key is required');
  }

  // Validate email format if provided
  if (config?.email?.from && !isValidEmail(config.email.from)) {
    errors.push('Invalid "from" email address format');
  }

  if (config?.email?.replyTo && !isValidEmail(config.email.replyTo)) {
    errors.push('Invalid "replyTo" email address format');
  }

  // Validate numeric values
  if (config?.email?.batchSize && (!Number.isInteger(config.email.batchSize) || config.email.batchSize < 1)) {
    errors.push('Email batch size must be a positive integer');
  }

  if (config?.voice?.batchSize && (!Number.isInteger(config.voice.batchSize) || config.voice.batchSize < 1)) {
    errors.push('Voice batch size must be a positive integer');
  }

  if (config?.general?.retryAttempts && (!Number.isInteger(config.general.retryAttempts) || config.general.retryAttempts < 0)) {
    errors.push('Retry attempts must be a non-negative integer');
  }

  if (config?.webhooks?.port && (!Number.isInteger(config.webhooks.port) || config.webhooks.port < 1 || config.webhooks.port > 65535)) {
    errors.push('Webhook port must be between 1 and 65535');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load configuration from file
 * @param {string} [configPath] - Optional custom config path
 * @returns {object} Configuration object
 */
export function loadConfig(configPath = getConfigPath()) {
  try {
    if (!fs.existsSync(configPath)) {
      return getDefaultConfig();
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Merge with defaults to ensure all fields exist
    return mergeConfig(getDefaultConfig(), config);
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 * @param {string} [configPath] - Optional custom config path
 * @returns {object} Result with success flag and optional error message
 */
export function saveConfig(config, configPath = getConfigPath()) {
  try {
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save config (validation is optional and done elsewhere)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save config: ${error.message}`
    };
  }
}

/**
 * Merge configuration objects (deep merge)
 * @param {object} defaultConfig - Default configuration
 * @param {object} userConfig - User configuration to merge
 * @returns {object} Merged configuration
 */
export function mergeConfig(defaultConfig, userConfig) {
  const merged = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone

  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  deepMerge(merged, userConfig);
  return merged;
}

/**
 * Check if a string is a valid email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get configuration value by dot notation path
 * @param {object} config - Configuration object
 * @param {string} path - Dot notation path (e.g., 'email.mailgun.apiKey')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
export function getConfigValue(config, path, defaultValue = null) {
  return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
}

/**
 * Set configuration value by dot notation path
 * @param {object} config - Configuration object to modify
 * @param {string} path - Dot notation path (e.g., 'email.mailgun.apiKey')
 * @param {*} value - Value to set
 * @returns {object} Modified configuration object
 */
export function setConfigValue(config, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => {
    if (!obj[key]) obj[key] = {};
    return obj[key];
  }, config);
  
  target[lastKey] = value;
  return config;
}
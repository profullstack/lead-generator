/**
 * AI Service Module
 * Template personalization: c0mpute first (see ./c0mpute.js), OpenAI as the
 * fallback when a key is set.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createC0mpute } from './c0mpute.js';

dotenv.config();

/**
 * AI Service class for template personalization
 */
export class AIService {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: config.maxTokens || parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
      temperature: config.temperature || parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      ...config
    };

    // c0mpute first. `c0mpute: false` skips it; a router can be passed in.
    this.c0mpute = config.c0mpute === false
      ? null
      : config.c0mpute || createC0mpute({
        apiKey: config.c0mputeApiKey,
        timeoutMs: config.c0mputeTimeoutMs
      });

    if (!this.config.apiKey && !config.client && !this.c0mpute) {
      throw new Error('OpenAI API key is required');
    }

    // Use provided client for testing, otherwise create new OpenAI client
    this.client = config.client || (this.config.apiKey
      ? new OpenAI({
        apiKey: this.config.apiKey
      })
      : null);
  }

  /**
   * Generate AI completion for given prompt
   * @param {string} prompt - The prompt to send to AI
   * @param {Object} options - Additional options
   * @returns {Promise<string>} AI response
   */
  async generateCompletion(prompt, options = {}) {
    const system = 'You are a professional sales email personalization assistant. Generate personalized, professional, and engaging content based on the provided information.';

    if (this.c0mpute) {
      try {
        const { object } = await this.c0mpute.generateObject({
          system,
          user: prompt,
          maxTokens: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
          feature: 'lead-generator'
        });
        this.lastProvider = 'c0mpute';
        return JSON.stringify(object);
      } catch (error) {
        if (!this.client) {
          throw new Error(`AI completion failed: ${error.message}`);
        }
        console.warn(`c0mpute failed, falling back to OpenAI: ${error.message}`);
      }
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: system
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        response_format: { type: 'json_object' }
      });

      this.lastProvider = 'openai';
      return response.choices[0]?.message?.content;
    } catch (error) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`AI completion failed: ${error.message}`);
    }
  }

  /**
   * Create personalization prompt for template
   * @param {Object} template - Email template
   * @param {Object} leadData - Lead information
   * @param {Object} senderInfo - Sender information
   * @returns {string} Formatted prompt
   */
  createPersonalizationPrompt(template, leadData, senderInfo = {}) {
    const placeholders = template.placeholders || [];
    
    return `
You are personalizing a sales email template. Generate appropriate values for the following placeholders based on the lead and sender information provided.

TEMPLATE PLACEHOLDERS TO FILL:
${placeholders.map(p => `- ${p}`).join('\n')}

LEAD INFORMATION:
- Name: ${leadData.FirstName} ${leadData.LastName || ''}
- Company: ${leadData.Company || 'Unknown'}
- Industry: ${leadData.Industry || 'Unknown'}
- Title: ${leadData.Title || 'Unknown'}
- Email: ${leadData.WorkEmail || leadData.PersonalEmail || 'Unknown'}
- Phone: ${leadData.Phone || 'Unknown'}

SENDER INFORMATION:
- Name: ${senderInfo.name || 'Sales Representative'}
- Title: ${senderInfo.title || 'Sales Director'}
- Company: ${senderInfo.company || 'Our Company'}

INSTRUCTIONS:
1. Generate professional, personalized values for each placeholder
2. Make content relevant to the lead's industry and role
3. Keep tone professional but friendly
4. For unknown fields, generate reasonable assumptions based on available data
5. Return response as valid JSON object with placeholder names as keys

EXAMPLE OUTPUT FORMAT:
{
  "FIRST_NAME": "John",
  "COMPANY_NAME": "Acme Corp",
  "INDUSTRY": "technology",
  "PAIN_POINT": "scaling technical infrastructure"
}

Generate the personalized values now:`;
  }

  /**
   * Perform basic template personalization without AI
   * @param {Object} template - Email template
   * @param {Object} leadData - Lead information
   * @param {Object} senderInfo - Sender information
   * @returns {Object} Personalized template
   */
  basicPersonalization(template, leadData, senderInfo = {}) {
    const placeholderMap = {
      FIRST_NAME: leadData.FirstName || '[FIRST_NAME]',
      LAST_NAME: leadData.LastName || '[LAST_NAME]',
      COMPANY_NAME: leadData.Company || '[COMPANY_NAME]',
      INDUSTRY: leadData.Industry || '[INDUSTRY]',
      TITLE: leadData.Title || '[TITLE]',
      SENDER_NAME: senderInfo.name || '[SENDER_NAME]',
      SENDER_TITLE: senderInfo.title || '[SENDER_TITLE]',
      SENDER_COMPANY: senderInfo.company || '[SENDER_COMPANY]',
      CONTACT_LINK: senderInfo.contactLink || '[CONTACT_LINK]'
    };

    let personalizedSubject = template.subject || '';
    let personalizedBody = template.body || '';

    // Replace placeholders in subject and body
    for (const [placeholder, value] of Object.entries(placeholderMap)) {
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
      personalizedSubject = personalizedSubject.replace(regex, value);
      personalizedBody = personalizedBody.replace(regex, value);
    }

    return {
      subject: personalizedSubject,
      body: personalizedBody,
      personalizationType: 'basic'
    };
  }
}

/**
 * Personalize email template using AI
 * @param {Object} template - Email template object
 * @param {Object} leadData - Lead information
 * @param {Object} senderInfo - Sender information
 * @param {Object} options - Personalization options
 * @returns {Promise<Object>} Personalized email content
 */
export async function personalizeTemplate(template, leadData, senderInfo = {}, options = {}) {
  const aiService = new AIService(options);

  try {
    // Generate AI-enhanced placeholder values
    const placeholderValues = await generatePlaceholderValues(
      template.placeholders || [],
      leadData,
      senderInfo,
      options
    );

    // Apply personalization to template
    let personalizedSubject = template.subject || '';
    let personalizedBody = template.body || '';

    for (const [placeholder, value] of Object.entries(placeholderValues)) {
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
      personalizedSubject = personalizedSubject.replace(regex, value);
      personalizedBody = personalizedBody.replace(regex, value);
    }

    return {
      subject: personalizedSubject,
      body: personalizedBody,
      personalizationType: 'ai-enhanced',
      placeholderValues,
      template: template.id
    };
  } catch (error) {
    if (options.fallbackToBasic) {
      console.warn('AI personalization failed, falling back to basic personalization:', error.message);
      return aiService.basicPersonalization(template, leadData, senderInfo);
    }
    throw new Error(`AI personalization failed: ${error.message}`);
  }
}

/**
 * Generate AI-enhanced values for template placeholders
 * @param {Array} placeholders - Array of placeholder names
 * @param {Object} leadData - Lead information
 * @param {Object} senderInfo - Sender information
 * @param {Object} options - AI service options
 * @returns {Promise<Object>} Generated placeholder values
 */
export async function generatePlaceholderValues(placeholders, leadData, senderInfo = {}, options = {}) {
  const aiService = new AIService(options);
  
  const prompt = `
Generate personalized values for these email template placeholders based on the lead information:

PLACEHOLDERS: ${placeholders.join(', ')}

LEAD INFO:
- Name: ${leadData.FirstName} ${leadData.LastName || ''}
- Company: ${leadData.Company || 'Unknown'}
- Industry: ${leadData.Industry || 'Unknown'}
- Title: ${leadData.Title || 'Unknown'}

SENDER INFO:
- Name: ${senderInfo.name || 'Sales Representative'}
- Title: ${senderInfo.title || 'Sales Director'}

Return a JSON object with placeholder names as keys and personalized values. Make values professional, relevant, and engaging.

Example: {"FIRST_NAME": "John", "COMPANY_NAME": "Acme Corp", "PAIN_POINT": "scaling operations"}`;

  try {
    const response = await aiService.generateCompletion(prompt);
    const parsedResponse = JSON.parse(response);
    
    // Validate that we got values for the requested placeholders
    const result = {};
    for (const placeholder of placeholders) {
      result[placeholder] = parsedResponse[placeholder] || `[${placeholder}]`;
    }
    
    return result;
  } catch (error) {
    if (error.message.includes('JSON')) {
      throw new Error('Invalid AI response format: Could not parse JSON');
    }
    throw error;
  }
}

/**
 * Batch personalize multiple templates for multiple leads
 * @param {Array} templates - Array of email templates
 * @param {Array} leads - Array of lead data
 * @param {Object} senderInfo - Sender information
 * @param {Object} options - Personalization options
 * @returns {Promise<Array>} Array of personalized emails
 */
export async function batchPersonalize(templates, leads, senderInfo = {}, options = {}) {
  const results = [];
  const batchSize = options.batchSize || 10;
  const delay = options.delay || 1000; // 1 second delay between batches

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const batchPromises = batch.map(async (lead) => {
      try {
        // Select template (random or specified)
        const template = options.templateSelector 
          ? options.templateSelector(templates, lead)
          : templates[Math.floor(Math.random() * templates.length)];

        const personalizedEmail = await personalizeTemplate(
          template,
          lead,
          senderInfo,
          { ...options, fallbackToBasic: true }
        );

        return {
          lead,
          email: personalizedEmail,
          success: true
        };
      } catch (error) {
        return {
          lead,
          error: error.message,
          success: false
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < leads.length && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * Get AI service statistics
 * @param {Array} personalizedEmails - Array of personalized email results
 * @returns {Object} Statistics object
 */
export function getPersonalizationStats(personalizedEmails) {
  const stats = {
    total: personalizedEmails.length,
    successful: 0,
    failed: 0,
    aiEnhanced: 0,
    basicFallback: 0,
    templatesUsed: new Set()
  };

  for (const result of personalizedEmails) {
    if (result.success) {
      stats.successful++;
      
      if (result.email.personalizationType === 'ai-enhanced') {
        stats.aiEnhanced++;
      } else {
        stats.basicFallback++;
      }
      
      if (result.email.template) {
        stats.templatesUsed.add(result.email.template);
      }
    } else {
      stats.failed++;
    }
  }

  stats.successRate = stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) : 0;
  stats.aiEnhancementRate = stats.successful > 0 ? (stats.aiEnhanced / stats.successful * 100).toFixed(2) : 0;

  return stats;
}

export default {
  AIService,
  personalizeTemplate,
  generatePlaceholderValues,
  batchPersonalize,
  getPersonalizationStats
};
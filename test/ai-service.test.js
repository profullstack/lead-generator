/**
 * AI Service Tests
 * Testing OpenAI integration for template personalization
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { personalizeTemplate, generatePlaceholderValues, AIService } from '../src/ai-service.js';

// The OpenAI tests below exercise the fallback path; c0mpute is covered in
// its own block with a stub router.
process.env.C0MPUTE_DISABLED = '1';

describe('AI Service', () => {
  let aiService;
  let mockOpenAI;

  beforeEach(() => {
    // Mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: sinon.stub()
        }
      }
    };

    aiService = new AIService({
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      client: mockOpenAI
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('personalizeTemplate', () => {
    const template = {
      id: 'expansion',
      subject: 'Quick chat about [COMPANY_NAME]\'s growth?',
      body: `Hi [FIRST_NAME],

I saw you're expanding your team — awesome work.

I help [INDUSTRY] teams like yours get faster partner integrations without engineering bottlenecks.

Happy to share a few ideas — would a 10-minute chat sometime this week make sense?

Best,
[SENDER_NAME]`,
      placeholders: ['FIRST_NAME', 'COMPANY_NAME', 'INDUSTRY', 'SENDER_NAME']
    };

    const leadData = {
      FirstName: 'John',
      LastName: 'Doe',
      Company: 'Acme Corp',
      Industry: 'Technology',
      Title: 'CTO',
      WorkEmail: 'john.doe@acme.com'
    };

    const senderInfo = {
      name: 'Jane Smith',
      title: 'Sales Director',
      company: 'SolutionCorp'
    };

    it('should personalize template with AI-generated content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              FIRST_NAME: 'John',
              COMPANY_NAME: 'Acme Corp',
              INDUSTRY: 'technology',
              SENDER_NAME: 'Jane Smith'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await personalizeTemplate(template, leadData, senderInfo, {
        apiKey: 'test-api-key',
        client: mockOpenAI
      });

      expect(result).to.have.property('subject');
      expect(result).to.have.property('body');
      expect(result.subject).to.include('Acme Corp');
      expect(result.body).to.include('John');
      expect(result.body).to.include('technology');
      expect(result.body).to.include('Jane Smith');
    });

    it('should handle AI service errors gracefully', async () => {
      mockOpenAI.chat.completions.create.rejects(new Error('API Error'));

      try {
        await personalizeTemplate(template, leadData, senderInfo, {
          apiKey: 'test-api-key',
          client: mockOpenAI
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('AI personalization failed');
      }
    });

    it('should fall back to basic personalization if AI fails', async () => {
      const result = await personalizeTemplate(template, leadData, senderInfo, {
        apiKey: 'test-api-key',
        client: mockOpenAI,
        fallbackToBasic: true
      });

      expect(result.subject).to.include('Acme Corp');
      expect(result.body).to.include('John');
    });
  });

  describe('generatePlaceholderValues', () => {
    const leadData = {
      FirstName: 'John',
      LastName: 'Doe',
      Company: 'Acme Corp',
      Industry: 'Technology',
      Title: 'CTO'
    };

    const placeholders = ['FIRST_NAME', 'COMPANY_NAME', 'INDUSTRY', 'PAIN_POINT'];

    it('should generate AI-enhanced placeholder values', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              FIRST_NAME: 'John',
              COMPANY_NAME: 'Acme Corp',
              INDUSTRY: 'technology',
              PAIN_POINT: 'scaling technical infrastructure'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      const result = await generatePlaceholderValues(placeholders, leadData, {}, {
        apiKey: 'test-api-key',
        client: mockOpenAI
      });

      expect(result).to.have.property('FIRST_NAME', 'John');
      expect(result).to.have.property('COMPANY_NAME', 'Acme Corp');
      expect(result).to.have.property('INDUSTRY', 'technology');
      expect(result).to.have.property('PAIN_POINT', 'scaling technical infrastructure');
    });

    it('should handle invalid JSON response from AI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockOpenAI.chat.completions.create.resolves(mockResponse);

      try {
        await generatePlaceholderValues(placeholders, leadData, {}, {
          apiKey: 'test-api-key',
          client: mockOpenAI
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid AI response format');
      }
    });
  });

  describe('AIService class', () => {
    it('should initialize with correct configuration', () => {
      const service = new AIService({
        apiKey: 'test-key',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.8
      });

      expect(service.config.model).to.equal('gpt-4');
      expect(service.config.maxTokens).to.equal(1000);
      expect(service.config.temperature).to.equal(0.8);
    });

    it('should validate required configuration', () => {
      const saved = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      try {
        expect(() => {
          new AIService({});
        }).to.throw('OpenAI API key is required');
      } finally {
        if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
      }
    });

    it('should create prompt for template personalization', () => {
      const template = { placeholders: ['FIRST_NAME', 'COMPANY_NAME'] };
      const leadData = { FirstName: 'John', Company: 'Acme' };

      const prompt = aiService.createPersonalizationPrompt(template, leadData);

      expect(prompt).to.include('FIRST_NAME');
      expect(prompt).to.include('COMPANY_NAME');
      expect(prompt).to.include('John');
      expect(prompt).to.include('Acme');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;

      mockOpenAI.chat.completions.create.rejects(rateLimitError);

      try {
        await aiService.generateCompletion('test prompt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rate limit exceeded');
      }
    });
  });

  describe('Basic personalization fallback', () => {
    it('should perform basic template personalization without AI', () => {
      const template = {
        subject: 'Hello [FIRST_NAME] from [COMPANY_NAME]',
        body: 'Hi [FIRST_NAME], I noticed [COMPANY_NAME] is in [INDUSTRY].'
      };

      const leadData = {
        FirstName: 'John',
        Company: 'Acme Corp',
        Industry: 'Technology'
      };

      const senderInfo = {
        name: 'Jane Smith'
      };

      const result = aiService.basicPersonalization(template, leadData, senderInfo);

      expect(result.subject).to.equal('Hello John from Acme Corp');
      expect(result.body).to.equal('Hi John, I noticed Acme Corp is in Technology.');
    });

    it('should handle missing placeholder values gracefully', () => {
      const template = {
        subject: 'Hello [FIRST_NAME] from [MISSING_FIELD]',
        body: 'Hi [FIRST_NAME].'
      };

      const leadData = {
        FirstName: 'John'
      };

      const result = aiService.basicPersonalization(template, leadData, {});

      expect(result.subject).to.equal('Hello John from [MISSING_FIELD]');
      expect(result.body).to.equal('Hi John.');
    });
  });

  describe('c0mpute first', () => {
    it('does not need an OpenAI key when c0mpute is available', () => {
      const service = new AIService({ apiKey: '', c0mpute: { generateObject: sinon.stub() } });
      expect(service.client).to.equal(null);
    });

    it('returns the c0mpute JSON and never calls OpenAI', async () => {
      const c0mpute = { generateObject: sinon.stub().resolves({ object: { FIRST_NAME: 'Ada' }, provider: 'c0mpute' }) };
      const service = new AIService({ apiKey: 'sk-test', client: mockOpenAI, c0mpute });

      const text = await service.generateCompletion('prompt');

      expect(JSON.parse(text)).to.deep.equal({ FIRST_NAME: 'Ada' });
      expect(service.lastProvider).to.equal('c0mpute');
      expect(mockOpenAI.chat.completions.create.called).to.equal(false);
    });

    it('falls back to OpenAI when c0mpute fails', async () => {
      const c0mpute = { generateObject: sinon.stub().rejects(new Error('no node')) };
      mockOpenAI.chat.completions.create.resolves({ choices: [{ message: { content: '{"FIRST_NAME":"Bo"}' } }] });
      const service = new AIService({ apiKey: 'sk-test', client: mockOpenAI, c0mpute });

      const text = await service.generateCompletion('prompt');

      expect(JSON.parse(text)).to.deep.equal({ FIRST_NAME: 'Bo' });
      expect(service.lastProvider).to.equal('openai');
    });

    it('throws the c0mpute error when there is no OpenAI fallback', async () => {
      const c0mpute = { generateObject: sinon.stub().rejects(new Error('no node')) };
      const service = new AIService({ apiKey: '', c0mpute });

      try {
        await service.generateCompletion('prompt');
        expect.fail('should have thrown');
      } catch (error) {
        expect(error.message).to.equal('AI completion failed: no node');
      }
    });
  });
});

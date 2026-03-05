import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mjml2html = require('mjml');

interface CompiledTemplate {
  subject: string;
  html: string;
  text: string;
}

interface TemplateData {
  userName: string;
  variant?: string;
  headerTitle: string;
  headerSubtitle: string;
  footerText: string;
  unsubscribeText: string;
  apiUrl: string;
  dashboardUrl: string;
  unsubscribeToken?: string;
  manageEmailPreferencesLink: string;
  [key: string]: any;
}

@Injectable()
export class EmailTemplateCompilerService {
  private readonly logger = new Logger(EmailTemplateCompilerService.name);

  private readonly templatesPath = path.join(process.cwd(), 'apps/api-server/src/modules/email/templates');

  private templateCache = new Map<string, Handlebars.TemplateDelegate>();

  private partialCache = new Map<string, string>();

  constructor() {
    this.registerHandlebarsHelpers();
  }

  /**
   * Compiles a template by relative path (e.g. 'subscription/thank-you') and returns
   * { subject, html, text }.  The template file is a raw MJML content fragment that
   * gets injected into layouts/base.mjml via {{{content}}}.
   */
  async compileEmailByPath(
    relativePath: string,
    data: Record<string, any>,
    meta: { subject: string; title?: string; preview?: string },
  ): Promise<CompiledTemplate> {
    try {
      await this.loadPartials();

      const templatePath = path.join(this.templatesPath, `${relativePath}.hbs`);
      const cacheKey = `path:${relativePath}`;

      let template: Handlebars.TemplateDelegate;
      if (this.templateCache.has(cacheKey)) {
        template = this.templateCache.get(cacheKey);
      } else {
        const templateContent = await fs.readFile(templatePath, 'utf8');
        template = Handlebars.compile(templateContent);
        this.templateCache.set(cacheKey, template);
      }

      const baseLayout = await this.getBaseLayout();
      const contentHtml = template(data);

      const layoutData = {
        ...data,
        title: meta.title || meta.subject,
        preview: meta.preview || meta.subject,
        content: contentHtml,
      };

      const fullHtml = baseLayout(layoutData);

      let mjmlResult;
      try {
        mjmlResult = mjml2html(fullHtml, {
          validationLevel: 'soft',
          keepComments: false,
          minify: false,
        });
      } catch (mjmlError) {
        this.logger.error({ error: mjmlError.message, relativePath }, 'MJML conversion failed');
        throw mjmlError;
      }

      if (mjmlResult.errors && mjmlResult.errors.length > 0) {
        throw new Error(`MJML validation failed: ${JSON.stringify(mjmlResult.errors)}`);
      }

      const textVersion = contentHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        subject: meta.subject,
        html: mjmlResult.html,
        text: textVersion,
      };
    } catch (error) {
      this.logger.error({ relativePath, error: error.message }, 'Failed to compile email by path');
      throw new Error(`Email compilation failed for ${relativePath}: ${error.message}`);
    }
  }

  async compileProgressEmail(
    templateType: 'weekly-progress' | 'monthly-progress' | 'no-progress',
    data: TemplateData,
  ): Promise<CompiledTemplate> {
    try {
      // Sanitize template data to ensure no undefined values
      const sanitizedData = {
        ...data,
        headerTitle: data.headerTitle || '',
        headerSubtitle: data.headerSubtitle || '',
        footerText: data.footerText || '',
        unsubscribeText: data.unsubscribeText || '',
        userName: data.userName || '',
        apiUrl: data.apiUrl || '',
        dashboardUrl: data.dashboardUrl || '',
        manageEmailPreferencesLink: data.manageEmailPreferencesLink || '',
        unsubscribeToken: data.unsubscribeToken || '',
      };

      await this.loadPartials();

      const template = await this.getTemplate(templateType);
      const baseLayout = await this.getBaseLayout();

      const contentHtml = template(sanitizedData);

      if (!contentHtml || contentHtml.trim().length === 0) {
        this.logger.error({ templateType, sanitizedData }, 'Content template compilation returned empty result');
        throw new Error('Content template compilation returned empty result');
      }

      const layoutData = {
        ...sanitizedData,
        title: this.getEmailTitle(templateType, sanitizedData),
        preview: this.getEmailPreview(templateType, sanitizedData),
        content: contentHtml,
      };

      const fullHtml = baseLayout(layoutData);

      if (!fullHtml || fullHtml.trim().length === 0) {
        this.logger.error({ templateType, layoutData }, 'Base layout compilation returned empty result');
        throw new Error('Base layout compilation returned empty result');
      }

      // Validate MJML structure before conversion
      this.validateMjmlStructure(fullHtml, layoutData);

      let mjmlResult;
      try {
        mjmlResult = mjml2html(fullHtml, {
          validationLevel: 'soft',
          keepComments: false,
          minify: false,
          fonts: {
            Arial: 'https://fonts.googleapis.com/css?family=Arial',
          },
        });

        if (mjmlResult.errors && mjmlResult.errors.length > 0) {
          this.logger.error(
            {
              errors: mjmlResult.errors,
              mjmlContent: fullHtml,
              layoutData: JSON.stringify(layoutData, null, 2),
            },
            'MJML validation errors',
          );
          throw new Error(`MJML validation failed: ${JSON.stringify(mjmlResult.errors)}`);
        }

        if (mjmlResult.warnings && mjmlResult.warnings.length > 0) {
          this.logger.warn({ warnings: mjmlResult.warnings }, 'MJML validation warnings');
        }
      } catch (mjmlError) {
        this.logger.error(
          {
            error: mjmlError.message,
            stack: mjmlError.stack,
            mjmlSnippet: fullHtml.substring(0, 2000),
            mjmlLength: fullHtml.length,
            layoutData: JSON.stringify(layoutData, null, 2),
            errorType: mjmlError.constructor.name,
          },
          'MJML conversion failed',
        );
        throw mjmlError;
      }
      return {
        subject: this.getEmailSubject(templateType, data),
        html: mjmlResult.html,
        text: this.generateTextVersion(contentHtml, data),
      };
    } catch (error) {
      this.logger.error(
        {
          templateType,
          error: error.message,
          stack: error.stack,
          fullError: JSON.stringify(error, null, 2),
          dataKeys: Object.keys(data),
          availableHelpers: Object.keys(Handlebars.helpers),
          errorName: error.name,
          errorCause: error.cause,
        },
        'Failed to compile email template',
      );
      throw new Error(`Email template compilation failed: ${error.message}`);
    }
  }

  async compilePage(templateName: string, data: { [key: string]: any }): Promise<string> {
    try {
      await this.loadPartials();

      const template = await this.getPageTemplate(templateName);

      const result = template(data);

      return result;
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          stack: error.stack,
          name: error.name,
          templateName,
          dataKeys: Object.keys(data),
          availableHelpers: Object.keys(Handlebars.helpers),
          timestamp: new Date().toISOString(),
        },
        `Failed to compile page template: ${templateName}`,
      );
      throw new Error(`Page template compilation failed: ${error.message}`);
    }
  }

  private async loadPartials(): Promise<void> {
    if (this.partialCache.size > 0) {
      return;
    }

    const partialsPath = path.join(this.templatesPath, 'partials');

    try {
      const partialFiles = await fs.readdir(partialsPath);

      const partialPromises = partialFiles
        .filter((file) => file.endsWith('.hbs'))
        .map(async (file) => {
          const partialName = file.replace('.hbs', '');
          const partialContent = await fs.readFile(path.join(partialsPath, file), 'utf8');
          return { partialName, partialContent };
        });

      const partials = await Promise.all(partialPromises);

      for (const { partialName, partialContent } of partials) {
        this.partialCache.set(partialName, partialContent);
        Handlebars.registerPartial(partialName, partialContent);
      }
    } catch (error) {
      this.logger.error('Failed to load partials:', error);
    }
  }

  private async getTemplate(templateType: string): Promise<Handlebars.TemplateDelegate> {
    if (this.templateCache.has(templateType)) {
      return this.templateCache.get(templateType);
    }

    // Map monthly-progress to weekly-progress template since they share the same layout
    const actualTemplateType = templateType === 'monthly-progress' ? 'weekly-progress' : templateType;
    const templatePath = path.join(this.templatesPath, 'progress', `${actualTemplateType}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiled = Handlebars.compile(templateContent);

      this.templateCache.set(templateType, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateType}:`, error);
      throw new Error(`Template ${templateType} not found`);
    }
  }

  private async getPageTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
    const cacheKey = `page-${templateName}`;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    const templatePath = path.join(this.templatesPath, 'pages', `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiled = Handlebars.compile(templateContent);

      this.templateCache.set(cacheKey, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load page template ${templateName}:`, error);
      throw new Error(`Page template ${templateName} not found`);
    }
  }

  private async getBaseLayout(): Promise<Handlebars.TemplateDelegate> {
    const cacheKey = 'base-layout';

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    const layoutPath = path.join(this.templatesPath, 'layouts', 'base.mjml');

    try {
      const layoutContent = await fs.readFile(layoutPath, 'utf8');
      const compiled = Handlebars.compile(layoutContent);

      this.templateCache.set(cacheKey, compiled);
      return compiled;
    } catch (error) {
      this.logger.error('Failed to load base layout:', error);
      throw new Error('Base layout template not found');
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('concat', (...args) => {
      try {
        // Remove the last argument (Handlebars options object)
        const values = args.slice(0, -1);

        // Filter out undefined/null and convert to strings
        const result = values
          .filter((val) => val !== undefined && val !== null)
          .map((val) => String(val))
          .join('');

        return result;
      } catch (error) {
        this.logger.error({ error: error.message, stack: error.stack }, 'Concat helper error');
        return '';
      }
    });

    Handlebars.registerHelper('round', (value: number) => {
      try {
        const result = Math.round(value * 100);
        return result;
      } catch (error) {
        this.logger.error({ error: error.message, value }, 'Round helper error');
        return 0;
      }
    });

    // Less than
    Handlebars.registerHelper('lt', (a: number, b: number) => {
      try {
        const result = a < b;
        return result;
      } catch (error) {
        this.logger.error({ error: error.message, a, b }, 'LT helper error');
        return false;
      }
    });

    // Greater than
    Handlebars.registerHelper('gt', (a: number, b: number) => {
      try {
        const result = a > b;
        return result;
      } catch (error) {
        this.logger.error({ error: error.message, a, b }, 'GT helper error');
        return false;
      }
    });

    Handlebars.registerHelper('eq', function (a: any, b: any, options: any) {
      try {
        if (options && options.fn) {
          return a === b ? options.fn(this) : options.inverse(this);
        }
        return a === b;
      } catch (error) {
        return false;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getEmailTitle(templateType: string, data: TemplateData): string {
    const titles = {
      'weekly-progress': 'Weekly Progress Report',
      'monthly-progress': 'Monthly Progress Report',
      'no-progress': 'We Miss You!',
    };

    return titles[templateType] || 'Focus Bear Email';
  }

  private getEmailPreview(templateType: string, data: TemplateData): string {
    const previews = {
      'weekly-progress': `Hi ${data.userName}, here's your weekly progress report`,
      'monthly-progress': `Hi ${data.userName}, here's your monthly progress report`,
      'no-progress': `${data.userName}, we miss you at Focus Bear`,
    };

    return previews[templateType] || 'Focus Bear Update';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getEmailSubject(templateType: string, data: TemplateData): string {
    if (templateType === 'weekly-progress') {
      if (data.variant === 'daily') {
        return '🐻 Your Daily Progress Report at Focus Bear';
      }
      if (data.variant === 'weekly' || !data.variant) {
        return '🐻 Your Weekly Progress Report at Focus Bear';
      }
    }

    const subjects = {
      'monthly-progress': '🐻 Your Monthly Progress Report at Focus Bear',
      'no-progress': '🐻 We miss you at Focus Bear!',
      'inactivity-warning': '⚠️ Important: Your Focus Bear account will be deleted soon',
    };

    return subjects[templateType] || '🐻 Focus Bear Update';
  }

  private validateMjmlStructure(mjmlContent: string, layoutData: any): void {
    // Check for empty or undefined content
    if (!mjmlContent || mjmlContent.trim().length === 0) {
      this.logger.error('MJML content is empty');
      throw new Error('Generated MJML content is empty');
    }

    // Check for basic MJML structure
    if (!mjmlContent.includes('<mjml>') || !mjmlContent.includes('</mjml>')) {
      this.logger.error('Missing MJML root tags');
      throw new Error('Generated content is missing MJML root tags');
    }

    // Check for required MJML sections (using regex to handle attributes)
    const requiredTags = [
      { name: '<mj-head>', regex: /<mj-head[^>]*>/i },
      { name: '<mj-body>', regex: /<mj-body[^>]*>/i },
      { name: '<mj-section>', regex: /<mj-section[^>]*>/i },
      { name: '<mj-column>', regex: /<mj-column[^>]*>/i },
    ];
    const missingTags = requiredTags.filter((tag) => !tag.regex.test(mjmlContent)).map((tag) => tag.name);
    if (missingTags.length > 0) {
      this.logger.error({ missingTags, fullMjml: mjmlContent }, 'Missing required MJML tags');
      throw new Error(`Missing required MJML tags: ${missingTags.join(', ')}`);
    }

    // Check for unclosed or malformed Handlebars expressions
    const unclosedHandlebars = mjmlContent.match(/\{\{[^}]*$/gm);
    if (unclosedHandlebars) {
      this.logger.error({ unclosedHandlebars }, 'Unclosed Handlebars expressions found');
      throw new Error(`Unclosed Handlebars expressions: ${unclosedHandlebars.join(', ')}`);
    }

    // Check for undefined placeholders that weren't replaced
    const undefinedPlaceholders = mjmlContent.match(/\{\{\s*undefined\s*\}\}/g);
    if (undefinedPlaceholders) {
      this.logger.error({ undefinedPlaceholders }, 'Undefined placeholders found in MJML');
      throw new Error(`Undefined placeholders in MJML: ${undefinedPlaceholders.join(', ')}`);
    }

    // Validate key template variables were replaced
    const templateVars = ['headerTitle', 'headerSubtitle', 'footerText', 'content'];
    const unreplacedVars = templateVars.filter(
      (varName) => mjmlContent.includes(`{{${varName}}}`) || mjmlContent.includes(`{{ ${varName} }}`),
    );
    if (unreplacedVars.length > 0) {
      this.logger.error({ unreplacedVars }, 'Template variables not replaced');
      this.logger.error({ layoutData: JSON.stringify(layoutData, null, 2) }, 'Layout data provided');
      throw new Error(`Template variables not replaced: ${unreplacedVars.join(', ')}`);
    }
  }

  private generateTextVersion(html: string, data: TemplateData): string {
    let text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    text += `\n\nManage preferences: ${data.manageEmailPreferencesLink}`;

    return text;
  }
}

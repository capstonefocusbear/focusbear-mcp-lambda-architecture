import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import mjml2html from 'mjml';

interface CompiledTemplate {
  subject: string;
  html: string;
  text: string;
}

interface TemplateData {
  userName: string;
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
    this.logger.log('Initializing EmailTemplateCompilerService...');
    this.registerHandlebarsHelpers();
    this.logger.log(`Handlebars helpers registered: ${Object.keys(Handlebars.helpers).join(', ')}`);
  }

  async compileProgressEmail(
    templateType: 'weekly-progress' | 'no-progress',
    data: TemplateData,
  ): Promise<CompiledTemplate> {
    try {
      await this.loadPartials();

      const template = await this.getTemplate(templateType);

      const baseLayout = await this.getBaseLayout();

      const contentHtml = template(data);

      const layoutData = {
        ...data,
        title: this.getEmailTitle(templateType, data),
        preview: this.getEmailPreview(templateType, data),
        content: contentHtml,
      };

      const fullHtml = baseLayout(layoutData);

      const mjmlResult = mjml2html(fullHtml, {
        validationLevel: 'soft',
        fonts: {
          Arial: 'https://fonts.googleapis.com/css?family=Arial',
        },
      });

      if (mjmlResult.errors.length > 0) {
        this.logger.warn('MJML compilation warnings:', mjmlResult.errors);
      }

      return {
        subject: this.getEmailSubject(templateType, data),
        html: mjmlResult.html,
        text: this.generateTextVersion(contentHtml, data),
      };
    } catch (error) {
      this.logger.error('Failed to compile email template:', error);
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
      this.logger.error(`Failed to compile page template: ${templateName}`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        templateName,
        dataKeys: Object.keys(data),
        availableHelpers: Object.keys(Handlebars.helpers),
        timestamp: new Date().toISOString(),
      });
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

    const templatePath = path.join(this.templatesPath, 'progress', `${templateType}.hbs`);

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
      return args.slice(0, -1).join('');
    });

    Handlebars.registerHelper('round', (value: number) => {
      return Math.round(value * 100);
    });
    // Less than
    Handlebars.registerHelper('lt', (a: number, b: number) => {
      return a < b;
    });
    // Greater than
    Handlebars.registerHelper('gt', (a: number, b: number) => {
      return a > b;
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getEmailTitle(templateType: string, data: TemplateData): string {
    const titles = {
      'weekly-progress': 'Weekly Progress Report',
      'no-progress': 'We Miss You!',
    };

    return titles[templateType] || 'Focus Bear Email';
  }

  private getEmailPreview(templateType: string, data: TemplateData): string {
    const previews = {
      'weekly-progress': `Hi ${data.userName}, here's your weekly progress report`,
      'no-progress': `${data.userName}, we miss you at Focus Bear`,
    };

    return previews[templateType] || 'Focus Bear Update';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getEmailSubject(templateType: string, data: TemplateData): string {
    const subjects = {
      'weekly-progress': '🐻 Your Weekly Progress Report',
      'no-progress': '🐻 We miss you at FocusBear!',
      'inactivity-warning': '⚠️ Important: Your FocusBear account will be deleted soon',
    };

    return subjects[templateType] || '🐻 Focus Bear Update';
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

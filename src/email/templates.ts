/**
 * Email Template Service
 * Handles fetching and processing email templates with variable substitution
 */

import { getPrismaClient } from '../lib/prisma-client';

interface TemplateData {
	id: number;
	name: string;
	subject: string;
	htmlContent: string;
	textContent: string;
}

interface TemplateVariables {
	[key: string]: string | number | boolean;
}

class TemplateService {
	/**
	 * Fetch a template by name from the database
	 */
	static async getTemplate(key: string, env: Env): Promise<TemplateData | null> {
		const prisma = getPrismaClient(env);

		try {
			const template = await prisma.template.findFirst({
				where: { key: key },
			});

			if (!template) {
				return null;
			}

			return {
				id: template.id,
				name: template.key,
				subject: template.subject,
				htmlContent: template.bodyHtml,
				textContent: template.bodyText,
			};
		} catch (error) {
			console.error(`Failed to fetch template ${key}: ${error}`);
			return null;
		}
	}

	/**
	 * Process a template with variable substitution
	 * Replaces {{variable}} placeholders with actual values
	 */
	static processTemplate(template: TemplateData, variables: TemplateVariables): { subject: string; html: string; text: string } {
		// Process subject
		let subject = template.subject;

		// Process HTML content if available
		let html = template.htmlContent;

		// Process text content
		let text = template.textContent;

		// Replace variables in all content
		Object.entries(variables).forEach(([key, value]) => {
			const placeholder = new RegExp(`{{${key}}}`, 'g');
			subject = subject.replace(placeholder, String(value));

			html = html.replace(placeholder, String(value));

			text = text.replace(placeholder, String(value));
		});

		return { subject, html, text };
	}

	/**
	 * Get a processed template ready for sending
	 */
	static async getProcessedTemplate(
		key: string,
		variables: TemplateVariables,
		env: Env,
	): Promise<{ subject: string; html: string; text: string } | null> {
		const template = await this.getTemplate(key, env);

		if (!template) {
			console.error(`Template not found: ${key}`);
			return null;
		}

		return this.processTemplate(template, variables);
	}
}

export default TemplateService;

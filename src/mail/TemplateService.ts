/**
 * Email Template Service
 * Handles fetching and processing email templates with variable substitution
 */

interface TemplateData {
	id: number;
	name: string;
	subject: string;
	htmlContent: string | null;
	textContent: string;
}

interface TemplateVariables {
	[key: string]: string | number | boolean;
}

class TemplateService {
	/**
	 * Fetch a template by name from the database
	 */
	static async getTemplate(name: string, env: Env): Promise<TemplateData | null> {
		const query = `
      SELECT id, name, subject, html_content as htmlContent, text_content as textContent
      FROM email_template
      WHERE name = ?
    `;

		try {
			const result = await env.DB.prepare(query).bind(name).first();
			return result as TemplateData | null;
		} catch (error) {
			console.error(`Failed to fetch template ${name}: ${error}`);
			return null;
		}
	}

	/**
	 * Process a template with variable substitution
	 * Replaces {{variable}} placeholders with actual values
	 */
	static processTemplate(template: TemplateData, variables: TemplateVariables): { subject: string; html: string | null; text: string } {
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

			if (html) {
				html = html.replace(placeholder, String(value));
			}

			text = text.replace(placeholder, String(value));
		});

		return {
			subject,
			html,
			text,
		};
	}

	/**
	 * Get a processed template ready for sending
	 */
	static async getProcessedTemplate(
		name: string,
		variables: TemplateVariables,
		env: Env,
	): Promise<{ subject: string; html: string | null; text: string } | null> {
		const template = await this.getTemplate(name, env);

		if (!template) {
			console.error(`Template not found: ${name}`);
			return null;
		}

		return this.processTemplate(template, variables);
	}
}

export default TemplateService;

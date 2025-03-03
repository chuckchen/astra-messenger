/**
 * Email Blacklist Service
 * Handles checking, adding, and removing emails from the blacklist
 */

interface BlacklistResult {
	isBlacklisted: boolean;
	reason?: string;
}

class BlacklistService {
	/**
	 * Check if an email is blacklisted
	 */
	static async isBlacklisted(email: string, env: Env): Promise<BlacklistResult> {
		const query = `
      SELECT email_blacklist.reason
      FROM email_blacklist
      JOIN email ON email.id = email_blacklist.email_id
      WHERE email.address = ?
    `;

		try {
			const result = await env.DB.prepare(query).bind(email).first<{ reason: string } | null>();

			if (result) {
				return {
					isBlacklisted: true,
					reason: result.reason,
				};
			}

			return { isBlacklisted: false };
		} catch (error) {
			console.error(`Failed to check blacklist for ${email}: ${error}`);
			// Default to not blacklisted in case of error to avoid blocking legitimate emails
			return { isBlacklisted: false };
		}
	}

	/**
	 * Add an email to the blacklist
	 */
	static async addToBlacklist(email: string, reason: string, env: Env): Promise<{ success: boolean; error?: string }> {
		// First, ensure the email exists in the email table
		const emailInsertQuery = `
      INSERT OR IGNORE INTO email (address)
      VALUES (?)
    `;

		// Then, get the email ID
		const getEmailIdQuery = `
      SELECT id FROM email WHERE address = ?
    `;

		// Finally, add to blacklist
		const blacklistInsertQuery = `
      INSERT OR REPLACE INTO email_blacklist (email_id, reason)
      VALUES (?, ?)
    `;

		try {
			// Start a transaction
			await env.DB.prepare('BEGIN').run();

			// Ensure email exists
			await env.DB.prepare(emailInsertQuery).bind(email).run();

			// Get email ID
			const emailResult = await env.DB.prepare(getEmailIdQuery).bind(email).first<{ id: number }>();

			if (!emailResult) {
				await env.DB.prepare('ROLLBACK').run();
				return { success: false, error: 'Failed to get email ID' };
			}

			// Add to blacklist
			await env.DB.prepare(blacklistInsertQuery).bind(emailResult.id, reason).run();

			// Commit transaction
			await env.DB.prepare('COMMIT').run();

			return { success: true };
		} catch (error) {
			// Rollback on error
			await env.DB.prepare('ROLLBACK').run();
			console.error(`Failed to add ${email} to blacklist: ${error}`);
			return { success: false, error: String(error) };
		}
	}

	/**
	 * Remove an email from the blacklist
	 */
	static async removeFromBlacklist(email: string, env: Env): Promise<{ success: boolean; error?: string }> {
		const query = `
      DELETE FROM email_blacklist
      WHERE email_id IN (
        SELECT id FROM email WHERE address = ?
      )
    `;

		try {
			const result = await env.DB.prepare(query).bind(email).run();

			if (result.meta.changes === 0) {
				return { success: false, error: 'Email not found in blacklist' };
			}

			return { success: true };
		} catch (error) {
			console.error(`Failed to remove ${email} from blacklist: ${error}`);
			return { success: false, error: String(error) };
		}
	}
}

export default BlacklistService;

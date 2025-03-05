const getEmailName = (email: string) => {
	// Check if email has format "Name <email@example.com>"
	const displayNameMatch = email.match(/^([^<]+)<([^>]+)>$/);

	if (displayNameMatch) {
		// Return the display name part, trimmed of whitespace
		return displayNameMatch[1].trim();
	}

	// Fall back to username part before '@'
	const username = email.split('@')[0];
	return username;
};

export { getEmailName };

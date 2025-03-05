const getDisplayName = (email: string) => {
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

const getEmailAddress = (email: string) => {
	// Check if email has format "Name <email@example.com>"
	const emailAddressMatch = email.match(/<([^>]+)>/);

	if (emailAddressMatch) {
		// Return the email address part from inside the angle brackets
		return emailAddressMatch[1];
	}

	// If no angle brackets, assume the entire string is an email address
	return email;
};

const getEmail = (email: string) => {
	return { displayName: getDisplayName(email), emailAddress: getEmailAddress(email) };
};

export { getDisplayName, getEmail, getEmailAddress };

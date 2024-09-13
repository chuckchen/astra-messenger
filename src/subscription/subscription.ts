const unsubscribe = async ({ email, product }: { email: string; product: string }, env: Env): Promise<{ data: number; error: any }> => {
	const query = `
    UPDATE subscription
    SET deleted_at = ?
    FROM email, product
    WHERE email.id = subscription.email_id AND product.id = subscription.product_id AND email.address = ? AND product.name = ?
  `;
	const result = await env.DB.prepare(query).bind(new Date().toISOString(), email).run();

	if (result.meta.changes === 0) {
		return { data: result.meta.changes, error: 'No record found' };
	}

	return { data: result.meta.changes, error: null };
};

const subscribe = async (
	{ email, product, type = '' }: { email: string; product: string; type?: string | undefined },
	env: Env
): Promise<{ data: number; error: any }> => {
	const query = `
  INSERT INTO subscription (email_id, product_id, subscription_type)
  SELECT email.id, product.id, ?
  FROM email, product
  WHERE email.address = ? AND product.name = ?
`;

	const result = await env.DB.prepare(query).bind(type, email, product).run();

	if (result.meta.changes === 0) {
		console.error(`Insert failed with ${JSON.stringify(result.error)}`);
		return { data: result.meta.changes, error: 'Insert failed' };
	}

	return { data: result.meta.changes, error: null };
};

export { unsubscribe, subscribe };

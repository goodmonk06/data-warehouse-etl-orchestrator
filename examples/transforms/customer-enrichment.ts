/**
 * Example transform: Customer Enrichment
 *
 * This transform adds computed fields to customer data
 * - full_name: concatenation of first and last name
 * - email_domain: extracted domain from email
 * - customer_type: classification based on email domain
 */

export default async function transform(data: any[]): Promise<any[]> {
  return data.map(customer => {
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    const emailDomain = customer.email?.split('@')[1] || 'unknown';

    // Simple customer classification
    const customerType = emailDomain.includes('gmail') || emailDomain.includes('yahoo')
      ? 'consumer'
      : 'business';

    return {
      ...customer,
      full_name: fullName,
      email_domain: emailDomain,
      customer_type: customerType,
      enriched_at: new Date().toISOString(),
    };
  });
}

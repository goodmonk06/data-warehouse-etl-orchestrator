/**
 * Example transform: API Data Flattening
 *
 * This transform flattens nested API response data
 * Useful for converting complex JSON into flat tables
 */

export default async function transform(data: any[]): Promise<any[]> {
  return data.map(item => {
    // Handle nested address object (common in API responses)
    const flat: any = {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      website: item.website,
      company_name: item.company?.name,
      company_catchphrase: item.company?.catchPhrase,
      company_bs: item.company?.bs,
      address_street: item.address?.street,
      address_suite: item.address?.suite,
      address_city: item.address?.city,
      address_zipcode: item.address?.zipcode,
      address_lat: item.address?.geo?.lat,
      address_lng: item.address?.geo?.lng,
      extracted_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(flat).forEach(key => {
      if (flat[key] === undefined) {
        delete flat[key];
      }
    });

    return flat;
  });
}

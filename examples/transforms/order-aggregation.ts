/**
 * Example transform: Order Aggregation
 *
 * This transform aggregates order data by customer
 * Useful for building customer analytics tables
 */

export default async function transform(data: any[]): Promise<any[]> {
  const customerOrders: Record<string, any> = {};

  // Group orders by customer
  for (const order of data) {
    const customerId = order.customer_id;

    if (!customerOrders[customerId]) {
      customerOrders[customerId] = {
        customer_id: customerId,
        total_orders: 0,
        total_revenue: 0,
        completed_orders: 0,
        pending_orders: 0,
        first_order_date: order.order_date,
        last_order_date: order.order_date,
      };
    }

    const agg = customerOrders[customerId];
    agg.total_orders += 1;
    agg.total_revenue += parseFloat(order.total_amount || 0);

    if (order.status === 'completed') {
      agg.completed_orders += 1;
    } else if (order.status === 'pending') {
      agg.pending_orders += 1;
    }

    // Track date range
    if (new Date(order.order_date) < new Date(agg.first_order_date)) {
      agg.first_order_date = order.order_date;
    }
    if (new Date(order.order_date) > new Date(agg.last_order_date)) {
      agg.last_order_date = order.order_date;
    }
  }

  // Convert to array and add computed metrics
  return Object.values(customerOrders).map(agg => ({
    ...agg,
    average_order_value: agg.total_revenue / agg.total_orders,
    completion_rate: agg.completed_orders / agg.total_orders,
    aggregated_at: new Date().toISOString(),
  }));
}

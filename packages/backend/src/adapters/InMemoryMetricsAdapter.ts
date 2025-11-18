import { IMetricsAdapter, MetricLabels } from './IMetricsAdapter';

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: MetricLabels;
  timestamp: Date;
}

/**
 * In-memory metrics adapter for testing and development
 * Stores metrics in memory instead of sending to external service
 */
export class InMemoryMetricsAdapter implements IMetricsAdapter {
  private metrics: Metric[] = [];

  getName(): string {
    return 'in-memory';
  }

  async recordCounter(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.metrics.push({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  async recordGauge(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.metrics.push({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  async recordHistogram(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.metrics.push({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  async incrementCounter(name: string, labels?: MetricLabels): Promise<void> {
    await this.recordCounter(name, 1, labels);
  }

  async decrementGauge(name: string, labels?: MetricLabels): Promise<void> {
    await this.recordGauge(name, -1, labels);
  }

  async flush(): Promise<void> {
    console.log(`[InMemoryMetrics] Flushing ${this.metrics.length} metrics`);
  }

  async getSnapshot(): Promise<Record<string, any>> {
    const snapshot: Record<string, any> = {};

    for (const metric of this.metrics) {
      const key = metric.labels
        ? `${metric.name}{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : metric.name;

      if (!snapshot[key]) {
        snapshot[key] = { type: metric.type, values: [] };
      }

      snapshot[key].values.push({
        value: metric.value,
        timestamp: metric.timestamp,
      });
    }

    return snapshot;
  }

  // Utility methods for testing
  getMetrics(): Metric[] {
    return this.metrics;
  }

  clear(): void {
    this.metrics = [];
  }

  getCount(): number {
    return this.metrics.length;
  }
}

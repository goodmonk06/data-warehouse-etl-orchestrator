import { AdapterRegistry } from '../adapters';
import { MetricLabels } from '../adapters/IMetricsAdapter';

/**
 * Centralized metrics collection utility
 * Delegates to configured metrics adapter
 */
class Metrics {
  async recordCounter(name: string, value: number = 1, labels?: MetricLabels): Promise<void> {
    try {
      const adapter = AdapterRegistry.getMetricsAdapter();
      await adapter.recordCounter(name, value, labels);
    } catch (error) {
      console.error('Failed to record counter metric:', error);
    }
  }

  async recordGauge(name: string, value: number, labels?: MetricLabels): Promise<void> {
    try {
      const adapter = AdapterRegistry.getMetricsAdapter();
      await adapter.recordGauge(name, value, labels);
    } catch (error) {
      console.error('Failed to record gauge metric:', error);
    }
  }

  async recordHistogram(name: string, value: number, labels?: MetricLabels): Promise<void> {
    try {
      const adapter = AdapterRegistry.getMetricsAdapter();
      await adapter.recordHistogram(name, value, labels);
    } catch (error) {
      console.error('Failed to record histogram metric:', error);
    }
  }

  async incrementCounter(name: string, labels?: MetricLabels): Promise<void> {
    await this.recordCounter(name, 1, labels);
  }

  /**
   * Time a function execution and record as histogram
   */
  async time<T>(name: string, fn: () => Promise<T>, labels?: MetricLabels): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      await this.recordHistogram(name, duration, labels);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      await this.recordHistogram(name, duration, { ...labels, status: 'error' });
      throw error;
    }
  }

  /**
   * Flush metrics to backend
   */
  async flush(): Promise<void> {
    try {
      const adapter = AdapterRegistry.getMetricsAdapter();
      await adapter.flush();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
}

export const metrics = new Metrics();

// Common metric names as constants
export const MetricNames = {
  // Pipeline metrics
  PIPELINE_EXECUTION_TIME: 'pipeline.execution.time',
  PIPELINE_EXECUTION_COUNT: 'pipeline.execution.count',
  PIPELINE_SUCCESS_COUNT: 'pipeline.success.count',
  PIPELINE_FAILURE_COUNT: 'pipeline.failure.count',
  PIPELINE_ROWS_PROCESSED: 'pipeline.rows.processed',

  // Data quality metrics
  DATA_QUALITY_SCORE: 'data_quality.score',
  DATA_QUALITY_VIOLATIONS: 'data_quality.violations',

  // Connection metrics
  CONNECTION_TEST_TIME: 'connection.test.time',
  CONNECTION_TEST_SUCCESS: 'connection.test.success',
  CONNECTION_TEST_FAILURE: 'connection.test.failure',

  // System metrics
  ACTIVE_PIPELINES: 'system.pipelines.active',
  SCHEDULED_PIPELINES: 'system.pipelines.scheduled',
};

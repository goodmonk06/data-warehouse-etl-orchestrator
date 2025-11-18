export interface MetricLabels {
  [key: string]: string | number;
}

export interface CounterMetric {
  name: string;
  value: number;
  labels?: MetricLabels;
  timestamp?: Date;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels?: MetricLabels;
  timestamp?: Date;
}

export interface HistogramMetric {
  name: string;
  value: number;
  labels?: MetricLabels;
  buckets?: number[];
  timestamp?: Date;
}

export interface IMetricsAdapter {
  /**
   * Get adapter name
   */
  getName(): string;

  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels?: MetricLabels): Promise<void>;

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, labels?: MetricLabels): Promise<void>;

  /**
   * Flush metrics to backend
   */
  flush(): Promise<void>;

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): Promise<Record<string, any>>;
}

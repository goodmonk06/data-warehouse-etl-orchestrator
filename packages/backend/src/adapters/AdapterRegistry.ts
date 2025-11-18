import { INotificationAdapter } from './INotificationAdapter';
import { IMetricsAdapter } from './IMetricsAdapter';
import { IStorageAdapter } from './IStorageAdapter';

/**
 * Central registry for adapters
 * Allows runtime configuration and swapping of implementations
 */
export class AdapterRegistry {
  private static notificationAdapters: Map<string, INotificationAdapter> = new Map();
  private static metricsAdapters: Map<string, IMetricsAdapter> = new Map();
  private static storageAdapters: Map<string, IStorageAdapter> = new Map();

  private static defaultNotificationAdapter?: string;
  private static defaultMetricsAdapter?: string;
  private static defaultStorageAdapter?: string;

  // Notification Adapters
  static registerNotificationAdapter(adapter: INotificationAdapter): void {
    this.notificationAdapters.set(adapter.getName(), adapter);
    if (!this.defaultNotificationAdapter) {
      this.defaultNotificationAdapter = adapter.getName();
    }
  }

  static getNotificationAdapter(name?: string): INotificationAdapter {
    const adapterName = name || this.defaultNotificationAdapter;
    if (!adapterName) {
      throw new Error('No notification adapter registered');
    }

    const adapter = this.notificationAdapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Notification adapter '${adapterName}' not found`);
    }

    return adapter;
  }

  static setDefaultNotificationAdapter(name: string): void {
    if (!this.notificationAdapters.has(name)) {
      throw new Error(`Notification adapter '${name}' not registered`);
    }
    this.defaultNotificationAdapter = name;
  }

  // Metrics Adapters
  static registerMetricsAdapter(adapter: IMetricsAdapter): void {
    this.metricsAdapters.set(adapter.getName(), adapter);
    if (!this.defaultMetricsAdapter) {
      this.defaultMetricsAdapter = adapter.getName();
    }
  }

  static getMetricsAdapter(name?: string): IMetricsAdapter {
    const adapterName = name || this.defaultMetricsAdapter;
    if (!adapterName) {
      throw new Error('No metrics adapter registered');
    }

    const adapter = this.metricsAdapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Metrics adapter '${adapterName}' not found`);
    }

    return adapter;
  }

  static setDefaultMetricsAdapter(name: string): void {
    if (!this.metricsAdapters.has(name)) {
      throw new Error(`Metrics adapter '${name}' not registered`);
    }
    this.defaultMetricsAdapter = name;
  }

  // Storage Adapters
  static registerStorageAdapter(adapter: IStorageAdapter): void {
    this.storageAdapters.set(adapter.getName(), adapter);
    if (!this.defaultStorageAdapter) {
      this.defaultStorageAdapter = adapter.getName();
    }
  }

  static getStorageAdapter(name?: string): IStorageAdapter {
    const adapterName = name || this.defaultStorageAdapter;
    if (!adapterName) {
      throw new Error('No storage adapter registered');
    }

    const adapter = this.storageAdapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Storage adapter '${adapterName}' not found`);
    }

    return adapter;
  }

  static setDefaultStorageAdapter(name: string): void {
    if (!this.storageAdapters.has(name)) {
      throw new Error(`Storage adapter '${name}' not registered`);
    }
    this.defaultStorageAdapter = name;
  }

  // Utility methods
  static listNotificationAdapters(): string[] {
    return Array.from(this.notificationAdapters.keys());
  }

  static listMetricsAdapters(): string[] {
    return Array.from(this.metricsAdapters.keys());
  }

  static listStorageAdapters(): string[] {
    return Array.from(this.storageAdapters.keys());
  }

  static clear(): void {
    this.notificationAdapters.clear();
    this.metricsAdapters.clear();
    this.storageAdapters.clear();
    this.defaultNotificationAdapter = undefined;
    this.defaultMetricsAdapter = undefined;
    this.defaultStorageAdapter = undefined;
  }
}

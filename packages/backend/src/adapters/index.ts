// Adapter Interfaces
export * from './INotificationAdapter';
export * from './IMetricsAdapter';
export * from './IStorageAdapter';

// In-Memory Implementations
export * from './InMemoryNotificationAdapter';
export * from './InMemoryMetricsAdapter';

// Adapter Registry
export { AdapterRegistry } from './AdapterRegistry';

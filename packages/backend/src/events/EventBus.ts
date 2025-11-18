import { DomainEvent, ETLDomainEvent } from './DomainEvent';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Simple in-memory event bus for domain events
 * Can be replaced with a message queue (RabbitMQ, Kafka) for production
 */
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];

  /**
   * Subscribe to a specific event type
   */
  on<T extends DomainEvent = DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): void {
    this.globalHandlers.push(handler);
  }

  /**
   * Unsubscribe from a specific event type
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  async emit(event: ETLDomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    // Execute type-specific handlers
    const promises = handlers.map((handler) => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
        return Promise.resolve();
      }
    });

    // Execute global handlers
    const globalPromises = this.globalHandlers.map((handler) => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error(`Error in global event handler:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all([...promises, ...globalPromises]);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers = [];
  }

  /**
   * Get count of handlers for a type
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  /**
   * Get count of global handlers
   */
  getGlobalHandlerCount(): number {
    return this.globalHandlers.length;
  }
}

// Singleton instance
export const eventBus = new EventBus();

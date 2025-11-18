import { INotificationAdapter, NotificationPayload, EmailPayload, SlackPayload, WebhookPayload, SMSPayload } from './INotificationAdapter';

/**
 * In-memory notification adapter for testing and development
 * Stores notifications in memory instead of sending them
 */
export class InMemoryNotificationAdapter implements INotificationAdapter {
  private notifications: NotificationPayload[] = [];

  getName(): string {
    return 'in-memory';
  }

  async send(payload: NotificationPayload): Promise<void> {
    this.notifications.push({
      ...payload,
      data: {
        ...payload.data,
        sentAt: new Date().toISOString(),
      },
    });
    console.log(`[InMemoryNotification] Sent: ${payload.subject}`);
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    await this.send({
      ...payload,
      data: {
        ...payload.data,
        type: 'email',
        to: payload.to,
      },
    });
  }

  async sendSlack(payload: SlackPayload): Promise<void> {
    await this.send({
      ...payload,
      data: {
        ...payload.data,
        type: 'slack',
        channel: payload.channel,
      },
    });
  }

  async sendWebhook(payload: WebhookPayload): Promise<void> {
    await this.send({
      ...payload,
      data: {
        ...payload.data,
        type: 'webhook',
        url: payload.url,
      },
    });
  }

  async sendSMS(payload: SMSPayload): Promise<void> {
    await this.send({
      ...payload,
      data: {
        ...payload.data,
        type: 'sms',
        to: payload.to,
      },
    });
  }

  async test(): Promise<boolean> {
    return true;
  }

  // Utility methods for testing
  getNotifications(): NotificationPayload[] {
    return this.notifications;
  }

  clear(): void {
    this.notifications = [];
  }

  getCount(): number {
    return this.notifications.length;
  }
}

export interface NotificationPayload {
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  data?: Record<string, any>;
}

export interface EmailPayload extends NotificationPayload {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  html?: string;
}

export interface SlackPayload extends NotificationPayload {
  channel: string;
  username?: string;
  iconEmoji?: string;
  attachments?: any[];
}

export interface WebhookPayload extends NotificationPayload {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface SMSPayload extends NotificationPayload {
  to: string;
}

export interface INotificationAdapter {
  /**
   * Get adapter name
   */
  getName(): string;

  /**
   * Send notification
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Send email notification
   */
  sendEmail?(payload: EmailPayload): Promise<void>;

  /**
   * Send Slack notification
   */
  sendSlack?(payload: SlackPayload): Promise<void>;

  /**
   * Send webhook notification
   */
  sendWebhook?(payload: WebhookPayload): Promise<void>;

  /**
   * Send SMS notification
   */
  sendSMS?(payload: SMSPayload): Promise<void>;

  /**
   * Test connection
   */
  test(): Promise<boolean>;
}

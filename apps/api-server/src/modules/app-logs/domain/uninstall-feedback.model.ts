export class UninstallFeedback {
  constructor(data?: UninstallFeedback) {
    this.app_platform = data?.app_platform || null;
    this.app_version = data?.app_version || null;
    this.feedback_message = data?.feedback_message || null;
    this.email = data?.email || null;
    this.log_url = data?.log_url || null;
  }

  app_platform?: string;

  app_version?: string;

  feedback_message?: string;

  email?: string;

  log_url?: string;
}

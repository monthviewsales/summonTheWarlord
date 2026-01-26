export class AppError extends Error {
  constructor(message, { cause, details } = {}) {
    super(message);
    this.name = this.constructor.name;
    if (cause) {
      this.cause = cause;
    }
    if (details) {
      this.details = details;
    }
  }
}

export class ConfigError extends AppError {}
export class KeychainError extends AppError {}
export class SwapError extends AppError {}
export class NotificationError extends AppError {}
export class DoctorError extends AppError {}

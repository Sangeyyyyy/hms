import { Injectable, Logger } from '@nestjs/common';

export interface AuditEvent {
  action: string;
  userId?: string;
  userEmail?: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  log(event: AuditEvent): void {
    const entry = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.logger.log(JSON.stringify(entry));
  }
}

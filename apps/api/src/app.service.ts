import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health(): object {
    return {
      status: 'ok',
      service: 'DNSC HMS API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}

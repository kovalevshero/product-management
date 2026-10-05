import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Public()
  @Get('live')
  live() { return { status: 'ok' }; }
  @Public()
  @Get('ready')
  async ready() {
    if (!await this.health.isDatabaseReady()) throw new ServiceUnavailableException('Database is unavailable');
    return { status: 'ready' };
  }
}

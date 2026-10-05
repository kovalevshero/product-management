import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { QueryAuditDto } from './dto/query-audit.dto.js';
import { AuditService } from './audit.service.js';
@Controller('api/audit-logs') @ApiTags('Audit') @ApiBearerAuth('access-token') @Roles('admin')
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() findAll(@Query() query: QueryAuditDto) { return this.audit.findAll(query); }
}

import { of } from 'rxjs';
import { DateFormatInterceptor } from '../src/common/interceptors/date-format.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('DateFormatInterceptor', () => {
  let interceptor: DateFormatInterceptor;

  beforeEach(() => {
    interceptor = new DateFormatInterceptor();
  });

  it('should format Date objects into YYYY-MM-DD HH:mm:ss strings', (done) => {
    const testDate = new Date('2025-01-01T15:01:04.000Z');
    const mockHandler: CallHandler = {
      handle: () => of({ created_at: testDate, nested: { updated_at: testDate } }),
    };

    interceptor.intercept({} as ExecutionContext, mockHandler).subscribe({
      next: (result) => {
        expect(typeof result.created_at).toBe('string');
        expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(result.nested.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        done();
      },
    });
  });
});

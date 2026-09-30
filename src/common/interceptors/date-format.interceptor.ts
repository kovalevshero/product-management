import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : null;

  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const seconds = padZero(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function transformDates(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) {
    return formatDateTime(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => transformDates(item));
  }
  if (typeof data === 'object') {
    const transformed: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val instanceof Date || (typeof val === 'string' && (key.includes('_at') || key.includes('At')))) {
        transformed[key] = formatDateTime(val) || val;
      } else if (typeof val === 'object') {
        transformed[key] = transformDates(val);
      } else {
        transformed[key] = val;
      }
    }
    return transformed;
  }
  return data;
}

@Injectable()
export class DateFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => transformDates(data)));
  }
}

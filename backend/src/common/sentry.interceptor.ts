import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        this.logger.error(`Error: ${error.message}`, error.stack);
        // Sentry integration - add when @sentry/nestjs is installed
        // Sentry.captureException(error);
        return throwError(() => error);
      }),
    );
  }
}

// =============================================================================
// @Traced Decorator - Easy Method-Level Tracing
// =============================================================================
// Use this decorator to automatically create spans for your methods
//
// Example usage:
//   @Traced('ticket.create')
//   async createTicket(data: CreateTicketDTO) {
//     // Your code here
//   }
// =============================================================================

import { trace, SpanStatusCode, Span, Context, context } from '@opentelemetry/api';

/**
 * Decorator to automatically trace method execution
 * @param spanName Optional custom span name (defaults to ClassName.methodName)
 */
export function Traced(spanName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer('txai-support', '1.0.0');

    descriptor.value = async function (...args: any[]) {
      const name = spanName || `${target.constructor.name}.${propertyKey}`;

      return await tracer.startActiveSpan(name, async (span: Span) => {
        try {
          // Add method metadata to span
          span.setAttributes({
            'code.function': propertyKey,
            'code.namespace': target.constructor.name,
            'code.filepath': __filename,
          });

          // Execute the original method
          const result = await originalMethod.apply(this, args);

          // Mark span as successful
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Record exception and mark span as errored
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * Manually create a traced function (for non-class methods)
 * @param name Span name
 * @param fn Function to trace
 */
export function tracedFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  const tracer = trace.getTracer('txai-support', '1.0.0');

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return await tracer.startActiveSpan(name, async (span: Span) => {
      try {
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }) as T;
}

/**
 * Get the current active span for manual instrumentation
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Add custom attributes to the current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add a custom event to the current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

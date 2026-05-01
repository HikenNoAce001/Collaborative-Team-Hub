/**
 * Generic Zod validator. Replaces req[source] with the parsed (coerced) value.
 * Errors propagate as ZodError → handled by middleware/error.js as 422.
 *
 * Express 5: `req.query` is a getter-only property, so plain assignment throws
 * in strict mode. Use defineProperty to override it with the parsed value.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source]
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

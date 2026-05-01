/**
 * Generic Zod validator. Replaces req[source] with the parsed (coerced) value.
 * Errors propagate as ZodError → handled by middleware/error.js as 422.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source]
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    req[source] = result.data;
    next();
  };
}

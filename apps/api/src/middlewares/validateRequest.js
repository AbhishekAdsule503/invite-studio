import { ZodError } from 'zod';

/**
 * Validates request body, query, or params against a Zod schema
 * @param {import('zod').ZodSchema | { body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schema
 */
export function validateRequest(schema) {
  return async (req, _res, next) => {
    try {
      if (schema._def) {
        // Direct schema - validates req.body by default
        req.body = await schema.parseAsync(req.body);
      } else {
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
          req.params = await schema.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}


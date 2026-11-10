import { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const messages = Object.values(error.constraints ?? {});
    const currentError = messages.length ? [{ field, messages }] : [];

    return [
      ...currentError,
      ...formatValidationErrors(error.children ?? [], field),
    ];
  });
}

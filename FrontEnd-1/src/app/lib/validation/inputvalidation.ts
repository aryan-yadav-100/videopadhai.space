import { z } from "zod";
import { Filter } from "bad-words";

const profanity = new Filter();

// Aligned validation rules with backend
const ALLOWED_CHARS = /^[a-z0-9 ?]*$/i; // Letters, numbers, spaces, and ?
const MIN_LENGTH = 1;
const MAX_LENGTH = 50;

export function validateTopic(rawInput: string) {
  // Normalize to lowercase for consistency
  const input = rawInput.toLowerCase().trim();

  // Zod schema matching backend rules
  const schema = z
    .string()
    .min(MIN_LENGTH, "Input cannot be empty")
    .max(MAX_LENGTH, "Max 50 characters allowed")
    .regex(ALLOWED_CHARS, "Only letters, numbers, spaces, and ? are allowed")
    .refine((val) => !profanity.isProfane(val), {
      message: "Input contains inappropriate language",
    });

  const result = schema.safeParse(input);

  return {
    success: result.success,
    data: result.success ? result.data : null,
    error: !result.success ? result.error.format() : null,
  };
}

// Export constants for use in components
export const VALIDATION_RULES = {
  MIN_LENGTH,
  MAX_LENGTH,
  ALLOWED_CHARS,
};
import { z } from "zod";
import {Filter} from "bad-words";

const profanity = new Filter();

// Whitelist regex: only a-z, 0-9, and space
const WHITELIST = /^[a-z0-9  ?]*$/;

export function validateTopic(rawInput: string) {
  // Normalize to lowercase
  const input = rawInput.toLowerCase();

  // Zod schema
  const schema = z
    .string()
    .min(1, "Input cannot be empty")
    .max(50, "Max 50 characters allowed")
    .regex(WHITELIST, "Only letters, numbers, and spaces allowed")
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

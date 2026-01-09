import { z } from "zod";
import validator from "validator";
import RE2 from "re2";
import createDOMPurify, { type DOMPurify, type WindowLike } from "dompurify";
import { JSDOM } from "jsdom";

// Lazily initialize DOMPurify for Node
let DOMPurifyInstance: DOMPurify;

function getDOMPurify() {
  if (!DOMPurifyInstance) {
    const window = new JSDOM("").window as unknown as WindowLike;
    DOMPurifyInstance = createDOMPurify(window);
  }
  return DOMPurifyInstance;
}

import { loadModule as loadCLD3 } from "cld3-asm";
import { checkProfanity } from "glin-profanity";
import type { ProfanityCheckerConfig } from "glin-profanity";
import sanitizeHtml from "sanitize-html";

// ============ ALIGNED VALIDATION RULES ============
// These match the frontend validation exactly
const ALLOWED_CHARS = /^[a-z0-9 ?]*$/i; // Letters, numbers, spaces, and ?
const MIN_LENGTH = 1;
const MAX_LENGTH = 50;

// Additional backend-only security checks
const DISALLOWED_SYMBOLS = /[<>{}\[\]\(\)\*\/\"':;#@!$%^&]/;

// ============ SCHEMAS ============
const TopicSchema = z
  .string()
  .min(MIN_LENGTH, "Input cannot be empty")
  .max(MAX_LENGTH, "Max 50 characters allowed")
  .regex(ALLOWED_CHARS, "Only letters, numbers, spaces, and ? are allowed")
  .refine((val) => !DISALLOWED_SYMBOLS.test(val), {
    message: "Text contains disallowed special symbols.",
  });

const InputSchema = z
  .object({
    text: z.string().min(1).max(10_000),
    allowHtml: z.boolean().optional().default(false),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

// ============ INJECTION PATTERNS ============
const INJECTION_PATTERNS: RE2[] = [
  new RE2("\\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|MERGE)\\b", "i"),
  new RE2("(--|;\\s*--|/\\*|\\*/|;\\s*SHUTDOWN)", "i"),
  new RE2("<\\s*script\\b", "i"),
  new RE2("\\bon(?:error|load|click|mouseover)\\s*=", "i"),
  new RE2("javascript\\s*:", "i"),
];

const URL_HINT = new RE2("(https?:\\/\\/|www\\.)", "i");

// ============ HELPERS ============
function containsUrl(s: string): boolean {
  if (!URL_HINT.test(s)) return false;
  for (const raw of s.split(/\s+/)) {
    const token = raw.trim().replace(/[()<>.,;:'\"!?]+$/g, "");
    if (!token) continue;
    if (
      validator.isURL(token, { require_protocol: false, allow_underscores: true }) ||
      validator.isFQDN(token.replace(/^www\./i, ""), { require_tld: true })
    ) {
      return true;
    }
  }
  return false;
}

async function isEnglish(text: string): Promise<boolean> {
  const factory = await loadCLD3();
  const id = factory.create(0, 5120);
  try {
    const result = id.findLanguage(text);
    return result.language === "en" && result.probability >= 0.7;
  } finally {
    id.dispose();
  }
}

function hasProfanity(text: string): boolean {
  const config: ProfanityCheckerConfig = {
    languages: ["english"],
    severityLevels: false,
    autoReplace: false,
  };

  const result = checkProfanity(text, config);
  return result.containsProfanity;
}

function sanitizeIfHtml(
  input: string,
  allowHtml: boolean
): { clean: string; hadHtml: boolean; mutated: boolean } {
  const hadHtml = /<\/?[a-z][\s\S]*>/i.test(input);
  if (!hadHtml) return { clean: input, hadHtml: false, mutated: false };

  const DOMPurify = getDOMPurify();

  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowHtml ? undefined : [],
    ALLOWED_ATTR: allowHtml ? undefined : [],
  });

  const tightened = sanitizeHtml(clean, allowHtml ? undefined : { allowedTags: [], allowedAttributes: {} });

  return { clean: tightened, hadHtml: true, mutated: tightened !== input };
}

// ============ CORE VALIDATOR (For general input) ============
async function validateSingle(body: unknown) {
  const reasons: string[] = [];
  const failedChecks: string[] = [];

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    reasons.push(...parsed.error.issues.map((i) => `${i.path.join(".") || "text"}: ${i.message}`));
    failedChecks.push("Zod");
    return { valid: false, reasons, failedChecks };
  }

  const { text, allowHtml } = parsed.data;

  if (containsUrl(text)) {
    reasons.push("URLs are not allowed.");
    failedChecks.push("validator");
  }

  for (const re of INJECTION_PATTERNS) {
    if (re.test(text)) {
      reasons.push("Injection/XSS pattern detected.");
      failedChecks.push("node-re2");
      break;
    }
  }

  if (hasProfanity(text)) {
    reasons.push("Profanity detected.");
    failedChecks.push("glin-profanity");
  }

  if (!(await isEnglish(text))) {
    reasons.push("Only English text is allowed.");
    failedChecks.push("cld3");
  }

  const { clean, hadHtml, mutated } = sanitizeIfHtml(text, allowHtml);
  if (hadHtml && !allowHtml) {
    reasons.push("HTML is not allowed.");
    failedChecks.push("DOMPurify");
  } else if (hadHtml && mutated) {
    reasons.push("HTML sanitized.");
    failedChecks.push("DOMPurify");
  }

  return {
    valid: reasons.length === 0,
    reasons,
    failedChecks,
    cleanedText: clean,
  };
}

// ============ TOPIC VALIDATOR (Simplified for chat topics) ============
export const validateTopic = async (topic: string) => {
  const reasons: string[] = [];
  
  try {
    // Normalize input
    const normalized = topic.trim().toLowerCase();
    
    // Step 1: Basic format validation (aligned with frontend)
    const basicValidation = TopicSchema.safeParse(normalized);
    if (!basicValidation.success) {
      basicValidation.error.issues.forEach((issue) => {
        reasons.push(issue.message);
      });
      return {
        valid: false,
        reasons,
        cleanedTopic: normalized,
      };
    }

    // Step 2: Security checks (backend only)
    
    // Check for URLs
    if (containsUrl(normalized)) {
      reasons.push("URLs are not allowed.");
    }

    // Check for injection patterns
    for (const re of INJECTION_PATTERNS) {
      if (re.test(normalized)) {
        reasons.push("Injection/XSS pattern detected.");
        break;
      }
    }

    // Check for profanity
    if (hasProfanity(normalized)) {
      reasons.push("Profanity detected.");
    }

    // Language check disabled for better UX with short prompts
    // You can re-enable this if needed for your use case
    // if (!(await isEnglish(normalized))) {
    //   reasons.push("Only English text is allowed.");
    // }

    // Check for HTML
    const { hadHtml } = sanitizeIfHtml(normalized, false);
    if (hadHtml) {
      reasons.push("HTML is not allowed.");
    }

    return {
      valid: reasons.length === 0,
      reasons,
      cleanedTopic: normalized,
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      valid: false,
      reasons: ["Validation error occurred"],
      cleanedTopic: topic,
    };
  }
};

// Export constants for consistency
export const VALIDATION_RULES = {
  MIN_LENGTH,
  MAX_LENGTH,
  ALLOWED_CHARS,
};
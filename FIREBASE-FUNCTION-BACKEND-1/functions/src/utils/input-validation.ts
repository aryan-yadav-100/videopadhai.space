import { z } from "zod";
import validator from "validator";
import RE2 from "re2";
import createDOMPurify, { type DOMPurify, type WindowLike } from "dompurify";
import { JSDOM } from "jsdom";

// Lazily initialize DOMPurify for Node (avoids cold-start issues)
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

// ---------------- Disallowed Symbols Regex ----------------
const DISALLOWED_SYMBOLS = /[<>{}\[\]\(\)\*\/\"':;#@!$%^&]/;

// ---------------- Schema ----------------
const InputSchema = z
  .object({
    text: z
      .string()
      .min(1)
      .max(10_000)
      .refine((val) => !DISALLOWED_SYMBOLS.test(val), {
        message: "Text contains disallowed special symbols.",
      }),
    allowHtml: z.boolean().optional().default(false),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

// ---------------- Injection Patterns ----------------
const INJECTION_PATTERNS: RE2[] = [
  new RE2("\\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|MERGE)\\b", "i"),
  new RE2("(--|;\\s*--|/\\*|\\*/|;\\s*SHUTDOWN)", "i"),
  new RE2("<\\s*script\\b", "i"),
  new RE2("\\bon(?:error|load|click|mouseover)\\s*=", "i"),
  new RE2("javascript\\s*:", "i"),
];

const URL_HINT = new RE2("(https?:\\/\\/|www\\.)", "i");

// ---------------- Helpers ----------------
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

// ---------------- Core Validator ----------------
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

// ---------------- Simple Topic Validator ----------------
export const validateTopic = async (topic: string) => {
  try {
    const result = await validateSingle({ text: topic, allowHtml: false });

    return {
      valid: result.valid,
      reasons: result.reasons || [],
      cleanedTopic: result.cleanedText || topic,
    };
  } catch {
    return {
      valid: false,
      reasons: ["Validation error occurred"],
      cleanedTopic: topic,
    };
  }
};

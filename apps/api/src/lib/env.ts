import { z } from "zod";

const apiEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().trim().min(1),
  BETTER_AUTH_URL: z.string().trim().url(),
  WEB_ORIGIN: z.string().trim().url(),
  PORT: z.coerce.number().int().positive().default(8787),
  AUDIUS_API_KEY: z.string().trim().min(1).optional(),
});

const parsedEnv = apiEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid API environment configuration. ${issues}`);
}

export const env = parsedEnv.data;

import { z } from "zod";

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
});

const parsedEnv = dbEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid database environment configuration. ${issues}`);
}

export const dbEnv = parsedEnv.data;

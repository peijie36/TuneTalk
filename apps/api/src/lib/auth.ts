import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import { env } from "@/src/lib/env";

const webOrigin = env.WEB_ORIGIN;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [webOrigin],
  plugins: [openAPI()],
});

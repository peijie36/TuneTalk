import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import { env } from "@/src/lib/env";

const webOrigin = env.WEB_ORIGIN;
const authOrigin = env.BETTER_AUTH_URL;
const webUrl = new URL(webOrigin);
const authUrl = new URL(authOrigin);
const isCrossOriginAuth = webUrl.origin !== authUrl.origin;
const usesSecureCookies = authUrl.protocol === "https:";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  advanced: {
    useSecureCookies: usesSecureCookies,
    defaultCookieAttributes:
      isCrossOriginAuth && usesSecureCookies
        ? {
            sameSite: "none",
            secure: true,
            partitioned: true,
          }
        : undefined,
  },
  trustedOrigins: [webOrigin],
  plugins: [openAPI()],
});

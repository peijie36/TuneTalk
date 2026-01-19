import { type auth } from "@/src/lib/auth";

export interface HonoAuthVariables {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}

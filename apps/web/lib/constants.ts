import { DEFAULT_API_BASE_URL } from "@tunetalk/shared";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

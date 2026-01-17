import SignInForm from "./sign-in-form";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeCallbackURL(value: SearchParams["callbackURL"]) {
  const fallback = "/discover";
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value === "/signin" || value === "/signup") return fallback;
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const callbackURL = normalizeCallbackURL((await searchParams).callbackURL);

  return <SignInForm callbackURL={callbackURL} />;
}

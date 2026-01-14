import SignInForm from "./sign-in-form";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeCallbackURL(value: SearchParams["callbackURL"]) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/")) return "/";
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

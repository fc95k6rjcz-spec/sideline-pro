import Logo from "../components/Logo";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in — Sideline Pro",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const errorParam = params.error;
  const redirectTo = params.redirect ?? "/admin";

  let errorMessage: string | null = null;
  if (errorParam === "not_allowed") {
    errorMessage =
      "That account isn't authorised for the Sideline Pro admin. Try a different email.";
  } else if (errorParam === "invalid") {
    errorMessage = "Incorrect email or password.";
  } else if (errorParam === "unexpected") {
    errorMessage = "Something went wrong signing you in. Please try again.";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-[#1d1d1f]">
      <div className="absolute inset-0 hero-radial" />
      <div className="absolute inset-0 subtle-grid opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <a href="/" className="mb-10">
          <Logo size={44} tagline />
        </a>

        <div className="w-full rounded-2xl border border-black/10 bg-white p-8 shadow-[0_14px_38px_rgba(0,0,0,0.06)] backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-[#6e6e73]">
            Admin access for invoice generation and receipt uploads.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-4 py-3 text-sm text-[#C8332B]">
              {errorMessage}
            </div>
          )}

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-xs text-[#86868b]">
          Authorised users only. Contact Justin if you need access.
        </p>
      </div>
    </main>
  );
}

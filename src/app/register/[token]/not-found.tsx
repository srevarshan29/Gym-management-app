export default function RegisterNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-zinc-900">
          Registration link not found
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          This link may be invalid or expired. Please ask front desk for a new
          QR code.
        </p>
      </div>
    </main>
  );
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="light min-h-screen bg-zinc-50 text-zinc-900">{children}</div>
  );
}

/**
 * Kiosk route: participate in the app shell flex column so the client can
 * fill the main pane height without negative vertical margins (which caused
 * extra scrollable blank space below the kiosk).
 */
export default function AttendanceKioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col pt-0">{children}</div>
  );
}

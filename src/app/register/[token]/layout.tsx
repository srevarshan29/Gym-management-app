import { RegisterShell } from "@/components/public-registration/register-shell";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RegisterShell>{children}</RegisterShell>;
}

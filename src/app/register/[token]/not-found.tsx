import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Registration link not found</CardTitle>
          <CardDescription>
            This link may be invalid or expired. Please ask front desk for a new
            QR code.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}

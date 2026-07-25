import { Construction } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ComingSoonState({
  title,
  description = "This section is coming soon.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />

      <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Construction className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">Coming soon</CardTitle>
          <CardDescription>
            We&apos;re building this feature. Check back in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

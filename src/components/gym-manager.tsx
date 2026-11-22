"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createGym } from "@/app/actions/gyms";
import {
  confirmGymPurgeAction,
  deactivateGymAction,
  reactivateGymAction,
  resumeGymPurgeAction,
  authorizeGymDataExportDownloadAction,
  runGymDataExportAction,
  scheduleGymDeletionAction,
} from "@/app/actions/gym-lifecycle";
import {
  gymExportDisplayStatusLabel,
  resolveGymExportDisplayStatus,
  gymExportCompletenessAdminWarning,
  gymExportCompletenessLabel,
} from "@/lib/gym-lifecycle/export/export-display-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGuardedFormAction, useGuardedServerAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type {
  GymDeletionMode,
  GymLifecycleStatus,
  GymPurgeStatus,
} from "@/lib/firestore/types";

type GymRow = {
  id: string;
  name: string;
  status: GymLifecycleStatus;
  deletionMode: GymDeletionMode | null;
  purgeStatus: GymPurgeStatus;
  dataExportStatus: "none" | "pending" | "ready" | "failed" | null;
  dataExportId: string | null;
  dataExportComplete: boolean | null;
  dataExportCompleteness:
    | "complete"
    | "records_only"
    | "partial"
    | "failed"
    | null;
  dataExportReadyAt: Date | null;
  dataExportDownloadExpiresAt: Date | null;
  deletionEligibleAt: Date | null;
  deletionLockedAt: Date | null;
  createdAtLabel: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  staffCount: number;
};

export function GymManager({ gyms }: { gyms: GymRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateGymDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gym</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deletion</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gyms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No gyms yet. Click &quot;Add gym&quot; to provision the first one.
              </TableCell>
            </TableRow>
          ) : (
            gyms.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>
                  <GymStatusBadge status={g.status} />
                </TableCell>
                <TableCell>
                  <GymDeletionSummary gym={g} />
                </TableCell>
                <TableCell>
                  {g.ownerName ? (
                    <div>
                      <div>{g.ownerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.ownerEmail}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary">No owner</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">{g.memberCount}</TableCell>
                <TableCell className="font-mono">{g.staffCount}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {g.createdAtLabel}
                </TableCell>
                <TableCell className="text-right">
                  <GymLifecycleActions gym={g} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function GymStatusBadge({ status }: { status: GymLifecycleStatus }) {
  if (status === "deactivated") {
    return <Badge variant="destructive">Deactivated</Badge>;
  }
  return <Badge variant="outline">Active</Badge>;
}

function deletionDaysRemaining(eligibleAt: Date | null): number | null {
  if (!eligibleAt) return null;
  const ms = eligibleAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function GymDeletionSummary({ gym }: { gym: GymRow }) {
  if (!gym.deletionMode) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const days = deletionDaysRemaining(gym.deletionEligibleAt);
  return (
    <div className="space-y-1 text-xs">
      <span className="block">Scheduled deletion</span>
      <span className="block text-muted-foreground">Purge: {gym.purgeStatus}</span>
      {gym.deletionEligibleAt ? (
        <span className="block text-muted-foreground">
          Eligible: {gym.deletionEligibleAt.toLocaleDateString()}
          {days != null ? ` (${days}d left)` : ""}
        </span>
      ) : null}
      <span className="block text-muted-foreground">
        Export:{" "}
        {gymExportDisplayStatusLabel(
          resolveGymExportDisplayStatus({
            dataExportStatus: gym.dataExportStatus,
            dataExportDownloadExpiresAt: gym.dataExportDownloadExpiresAt,
          }),
        )}
        {gym.dataExportReadyAt ? ` · ${gym.dataExportReadyAt.toLocaleString()}` : ""}
        {gym.dataExportStatus === "ready" && gym.dataExportCompleteness ? (
          <span className="block">
            {gymExportCompletenessLabel(gym.dataExportCompleteness)}
          </span>
        ) : null}
        {gym.dataExportStatus === "ready" &&
        gymExportCompletenessAdminWarning(gym.dataExportCompleteness) ? (
          <span className="block font-medium text-amber-700">
            {gymExportCompletenessAdminWarning(gym.dataExportCompleteness)}
          </span>
        ) : null}
        {gym.dataExportDownloadExpiresAt &&
        resolveGymExportDisplayStatus({
          dataExportStatus: gym.dataExportStatus,
          dataExportDownloadExpiresAt: gym.dataExportDownloadExpiresAt,
        }) === "ready"
          ? ` · until ${gym.dataExportDownloadExpiresAt.toLocaleString()}`
          : null}
      </span>
    </div>
  );
}

function GymLifecycleActions({ gym }: { gym: GymRow }) {
  if (gym.status === "active") {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <LifecycleConfirmDialog gymId={gym.id} gymName={gym.name} action="deactivate" />
      </div>
    );
  }

  const canReactivate =
    gym.deletionMode === "scheduled" &&
    gym.purgeStatus !== "purging" &&
    gym.purgeStatus !== "ready";

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canReactivate ? (
        <LifecycleConfirmDialog gymId={gym.id} gymName={gym.name} action="reactivate" />
      ) : null}
      {!gym.deletionMode ? (
        <SimpleGymActionDialog
          gymId={gym.id}
          gymName={gym.name}
          title="Schedule deletion"
          description={`Deactivates the gym and starts a 30-day recovery period for "${gym.name}". Reactivation cancels the request.`}
          action={scheduleGymDeletionAction}
          submitLabel="Schedule deletion"
          variant="destructive"
        />
      ) : null}
      {gym.deletionMode ? (
        <>
          <SimpleGymActionDialog
            gymId={gym.id}
            gymName={gym.name}
            title="Create data export (optional)"
            description="Builds a ZIP with sanitized records and tenant-owned files. Not required for deletion. Requires ALLOW_TENANT_GYM_DATA_EXPORT."
            action={runGymDataExportAction}
            submitLabel="Create export"
            variant="outline"
          />
          {resolveGymExportDisplayStatus({
            dataExportStatus: gym.dataExportStatus,
            dataExportDownloadExpiresAt: gym.dataExportDownloadExpiresAt,
          }) === "ready" && gym.dataExportId ? (
            <GymDataExportDownloadButton gymId={gym.id} exportId={gym.dataExportId} />
          ) : null}
          <SimpleGymActionDialog
            gymId={gym.id}
            gymName={gym.name}
            title="Confirm permanent deletion"
            description="Records final confirmation after the 30-day wait. Does not require an export. Destructive steps honor ALLOW_TENANT_GYM_PURGE."
            action={confirmGymPurgeAction}
            submitLabel="Confirm deletion"
            variant="destructive"
          />
          {(gym.purgeStatus === "failed" || gym.purgeStatus === "purging" || gym.purgeStatus === "ready") && (
            <SimpleGymActionDialog
              gymId={gym.id}
              gymName={gym.name}
              title="Resume purge step"
              description="Advances the resumable purge pipeline by one safe batch."
              action={resumeGymPurgeAction}
              submitLabel="Resume step"
              variant="outline"
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function GymDataExportDownloadButton({
  gymId,
  exportId,
}: {
  gymId: string;
  exportId: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const authorizeDownload = useGuardedServerAction(authorizeGymDataExportDownloadAction);

  const onDownload = React.useCallback(async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("gymId", gymId);
      const state = await authorizeDownload(undefined, fd);
      if (!state) {
        toast.error("Could not authorize download.");
        return;
      }
      if (!state.ok) {
        toast.error(state.error);
        return;
      }
      const authData = state.data;
      if (!authData) {
        toast.error("Could not authorize download.");
        return;
      }
      const res = await fetch("/api/admin/gym-data-export/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymId,
          exportId: authData.exportId,
          downloadToken: authData.downloadToken,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(payload?.error ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const fallback = `gymdesk-export-${gymId}.zip`;
      const filename =
        cd?.match(/filename="([^"]+)"/)?.[1] ??
        cd?.match(/filename=([^;]+)/)?.[1]?.trim() ??
        fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Download failed.");
    } finally {
      setLoading(false);
    }
  }, [authorizeDownload, gymId]);

  return (
    <Button type="button" size="sm" variant="outline" disabled={loading} onClick={onDownload}>
      {loading ? "Downloading…" : "Download export"}
    </Button>
  );
}

function SimpleGymActionDialog({
  gymId,
  gymName,
  title,
  description,
  action,
  submitLabel,
  variant,
}: {
  gymId: string;
  gymName: string;
  title: string;
  description: string;
  action: (_prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  variant?: "default" | "destructive" | "outline";
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const guardedAction = useGuardedFormAction(action);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant ?? "outline"} size="sm">
          {submitLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description} Gym: {gymName} ({gymId})
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="gymId" value={gymId} readOnly />
          <DialogFooter>
            <SubmitButton label={submitLabel} variant={variant} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({
  label,
  variant,
}: {
  label: string;
  variant?: "default" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant ?? "default"}>
      {pending ? "Working..." : label}
    </Button>
  );
}

function LifecycleConfirmDialog({
  gymId,
  gymName,
  action,
}: {
  gymId: string;
  gymName: string;
  action: "deactivate" | "reactivate";
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const serverAction =
    action === "deactivate" ? deactivateGymAction : reactivateGymAction;
  const guardedAction = useGuardedFormAction(serverAction);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const title =
    action === "deactivate" ? "Deactivate gym" : "Reactivate gym";
  const description =
    action === "deactivate"
      ? `Deactivate "${gymName}"? Staff and members lose access immediately. All data is preserved.`
      : `Reactivate "${gymName}"? Staff and members can sign in again.`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={action === "deactivate" ? "outline" : "default"}
          size="sm"
        >
          {action === "deactivate" ? "Deactivate" : "Reactivate"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="gymId" value={gymId} readOnly />
          <DialogFooter>
            <LifecycleSubmit action={action} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleSubmit({ action }: { action: "deactivate" | "reactivate" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={action === "deactivate" ? "destructive" : "default"}>
      {pending
        ? "Saving..."
        : action === "deactivate"
          ? "Deactivate gym"
          : "Reactivate gym"}
    </Button>
  );
}

function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create gym"}
    </Button>
  );
}

function CreateGymDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const guardedAction = useGuardedFormAction(createGym);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Gym created.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" /> Add gym
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Provision a new gym</DialogTitle>
            <DialogDescription>
              Creates a new tenant and its first owner account. The owner signs
              in with Google using the email below and can invite staff from
              Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym name</Label>
            <Input id="gym-name" name="gymName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-name">Owner name</Label>
            <Input id="owner-name" name="ownerName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-email">Owner Gmail</Label>
            <Input
              id="owner-email"
              name="ownerEmail"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <DialogFooter>
            <CreateSubmit />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
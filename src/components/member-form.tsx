"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { createMember, updateMember } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export type PackageOption = {
  id: string;
  name: string;
  price: number;
  durationLabel: string;
};

type CreateProps = {
  mode: "create";
  packages: PackageOption[];
  canRecordPayment: boolean;
};

type EditProps = {
  mode: "edit";
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
  };
};

type Props = CreateProps | EditProps;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function MemberForm(props: Props) {
  const action = props.mode === "create" ? createMember : updateMember;
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );

  const [packageId, setPackageId] = React.useState<string>(
    props.mode === "create" ? (props.packages[0]?.id ?? "") : "",
  );
  const [method, setMethod] = React.useState("CASH");
  const [logPayment, setLogPayment] = React.useState(false);

  React.useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  const selectedPackage =
    props.mode === "create"
      ? props.packages.find((p) => p.id === packageId)
      : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {props.mode === "edit" ? (
        <input type="hidden" name="id" value={props.member.id} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Member details</CardTitle>
          <CardDescription>Basic contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={props.mode === "edit" ? props.member.name : ""}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={props.mode === "edit" ? props.member.phone : ""}
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={props.mode === "edit" ? (props.member.email ?? "") : ""}
              placeholder="jane@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Used to email payment receipts. Leave blank to skip email receipts.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={
                props.mode === "edit" ? (props.member.notes ?? "") : ""
              }
              placeholder="Any relevant notes about this member"
            />
          </div>
        </CardContent>
      </Card>

      {props.mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Assign a package. This creates the member&apos;s first
              subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" name="packageId" value={packageId} />
            <input type="hidden" name="method" value={method} />
            <input
              type="hidden"
              name="logPayment"
              value={logPayment ? "1" : "0"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Package</Label>
                {props.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active packages. Create one on the Packages page first.
                  </p>
                ) : (
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.price)} / {p.durationLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
            </div>

            {props.canRecordPayment ? (
              <div className="rounded-lg border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={logPayment}
                    onChange={(e) => setLogPayment(e.target.checked)}
                  />
                  Record payment now
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Partial amounts are allowed — the balance can be paid in
                  installments.
                </p>
                {logPayment ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (INR)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedPackage?.price}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Leave unchecked to add the member now and collect payment
                    later (they will appear under Payments &rarr; Pending).
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton
          label={props.mode === "create" ? "Add member" : "Save changes"}
        />
      </div>
    </form>
  );
}

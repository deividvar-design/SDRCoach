"use client";

import { useActionState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createInvite, type InviteState } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(createInvite, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="rep@company.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="rep">
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invite"}</Button>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state.link && (
        <div className="bg-accent/50 flex items-center gap-2 rounded-md border p-2 text-sm">
          <code className="min-w-0 flex-1 truncate font-mono text-xs">{state.link}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(state.link!);
              toast.success("Invite link copied");
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
      )}
    </form>
  );
}

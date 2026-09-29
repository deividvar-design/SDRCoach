"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { changeRole } from "./actions";

export function RoleSelect({ membershipId, role }: { membershipId: string; role: "manager" | "rep" }) {
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={changeRole.bind(null, membershipId)}>
      <Select
        name="role"
        defaultValue={role}
        disabled={pending}
        aria-label="Role"
        className="h-8 w-28 text-xs"
        onChange={() => start(async () => {
          await changeRole(membershipId, new FormData(form.current!));
          toast.success("Role updated");
        })}
      >
        <option value="rep">Rep</option>
        <option value="manager">Manager</option>
      </Select>
    </form>
  );
}

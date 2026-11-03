"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/app/(app)/team/copy-link";
import { emailAccessLink, revokeAccessLink } from "../actions";

export function AccessRowActions({ id, link }: { id: string; link: string }) {
  const [pending, start] = useTransition();
  const done = (r: { ok: true } | { error: string }, msg: string) => {
    if ("error" in r) toast.error(r.error);
    else toast.success(msg);
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <CopyLink link={link} label="Copy" />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => done(await emailAccessLink(id), "Email sent"))}>Email it</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => done(await revokeAccessLink(id), "Link revoked"))}>Revoke</Button>
    </div>
  );
}

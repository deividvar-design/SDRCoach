import type { MemberRole } from "@/types/database";

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  manager: "Manager",
  rep: "Rep",
};

export function canManage(role: MemberRole | null | undefined) {
  return role === "owner" || role === "manager";
}

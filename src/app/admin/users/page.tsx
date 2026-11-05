"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Mail, MapPin, UserCog } from "lucide-react";
import type { DemoUser, Role } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Badge, Card, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/basic";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Label } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/requests/badges";
import { useAdminStore } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useAuthStore } from "@/store/auth-store";
import { COUNTRY_MAP } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FilterSelect, ResultCount, SearchInput, SortableHead, TableEmpty, Toolbar, sortBy, useSort } from "@/components/admin/table-tools";

type SortKey = "name" | "role" | "country" | "memberSince";

function RoleBadge({ role }: { role: Role }) {
  const tone =
    role === "admin"
      ? "bg-violet-500/14 text-violet-700 dark:text-violet-300"
      : role === "donor"
        ? "bg-primary/12 text-primary"
        : "bg-sky-500/14 text-sky-700 dark:text-sky-300";
  return <Badge className={`capitalize ${tone}`}>{role}</Badge>;
}

function UserStatusBadge({ status }: { status: DemoUser["status"] }) {
  return (
    <Badge className={status === "active" ? "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300" : "bg-red-500/12 text-red-700 dark:text-red-300"}>
      {status === "active" ? "Active" : "Suspended"}
    </Badge>
  );
}

export default function AdminUsersPage() {
  const users = useAdminStore((s) => s.users);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<"all" | Role>("all");
  const [status, setStatus] = React.useState<"all" | DemoUser["status"]>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { sort, toggle } = useSort<SortKey>({ key: "memberSince", dir: "desc" });

  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = users.filter(
      (u) =>
        (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) &&
        (role === "all" || u.role === role) &&
        (status === "all" || u.status === status),
    );
    return sortBy(filtered, sort, (u, k) => (k === "country" ? COUNTRY_MAP[u.country].name : u[k]));
  }, [users, q, role, status, sort]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="People" title="Users" description="Fictional demo accounts — requesters, donors and moderators." />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email" label="Search users" />
          <FilterSelect
            label="Filter by role"
            value={role}
            onChange={setRole}
            options={[
              { value: "all", label: "All roles" },
              { value: "requester", label: "Requesters" },
              { value: "donor", label: "Donors" },
              { value: "admin", label: "Admins" },
            ]}
          />
          <FilterSelect
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <ResultCount shown={rows.length} total={users.length} noun="users" />
        </Toolbar>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="User" sortKey="name" sort={sort} onSort={toggle} />
              <SortableHead label="Role" sortKey="role" sort={sort} onSort={toggle} />
              <SortableHead label="Country" sortKey="country" sort={sort} onSort={toggle} />
              <TableHead>Status</TableHead>
              <SortableHead label="Member since" sortKey="memberSince" sort={sort} onSort={toggle} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={5} />
            ) : (
              rows.map((u) => (
                <TableRow
                  key={u.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setOpenId(u.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(u.id))}
                >
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <DemoAvatar seed={u.image} className="size-8" label={u.name} />
                      <span className="grid">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    {COUNTRY_MAP[u.country].flag} {COUNTRY_MAP[u.country].name}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.memberSince)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <UserDrawer userId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

function UserDrawer({ userId, onOpenChange }: { userId: string | null; onOpenChange: (o: boolean) => void }) {
  const user = useAdminStore((s) => s.users.find((u) => u.id === userId));
  const setUserStatus = useAdminStore((s) => s.setUserStatus);
  const setUserRole = useAdminStore((s) => s.setUserRole);
  const allRequests = useRequestsStore((s) => s.requests);
  const allContributions = useContributionsStore((s) => s.contributions);
  const sessionId = useAuthStore((s) => s.session?.userId);
  const [confirm, setConfirm] = React.useState(false);
  const [pendingRole, setPendingRole] = React.useState<Role | null>(null);

  const requests = React.useMemo(() => allRequests.filter((r) => r.userId === userId), [allRequests, userId]);
  const contributions = React.useMemo(() => allContributions.filter((c) => c.userId === userId), [allContributions, userId]);
  const isSelf = user?.id === sessionId;

  return (
    <Sheet open={!!userId} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0">
        {!user ? (
          <div className="p-8">
            <SheetTitle>User not found</SheetTitle>
          </div>
        ) : (
          <>
            <div className="border-b p-6 pr-12">
              <div className="flex items-center gap-4">
                <DemoAvatar seed={user.image} className="size-16" rounded="2xl" label={user.name} />
                <div className="grid gap-1">
                  <SheetTitle>{user.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1.5">
                    <Mail className="size-3.5" /> {user.email}
                  </SheetDescription>
                  <div className="flex gap-1.5">
                    <RoleBadge role={user.role} />
                    <UserStatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-6 p-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Country</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <MapPin className="size-3.5" /> {COUNTRY_MAP[user.country].name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Member since</dt>
                  <dd className="font-medium">{formatDate(user.memberSince)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Bio</dt>
                  <dd className="text-muted-foreground">{user.bio || "—"}</dd>
                </div>
              </dl>

              <div className="grid gap-3 rounded-2xl border p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <UserCog className="size-4" /> Account management
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Role</Label>
                  <NativeSelect
                    id="user-role"
                    value={user.role}
                    disabled={isSelf}
                    onChange={(e) => setPendingRole(e.target.value as Role)}
                  >
                    <option value="requester">Requester</option>
                    <option value="donor">Donor</option>
                    <option value="admin">Admin</option>
                  </NativeSelect>
                  {isSelf && <p className="text-xs text-muted-foreground">You can&apos;t change your own role here.</p>}
                </div>
                <Button
                  variant={user.status === "active" ? "destructive" : "default"}
                  disabled={isSelf}
                  onClick={() => setConfirm(true)}
                >
                  {user.status === "active" ? <Ban /> : <CheckCircle2 />}
                  {user.status === "active" ? "Suspend user" : "Reactivate user"}
                </Button>
              </div>

              {requests.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold">Requests ({requests.length})</p>
                  <ul className="divide-y rounded-2xl border">
                    {requests.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="min-w-0 truncate">{r.title}</span>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contributions.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold">Simulated contributions ({contributions.length})</p>
                  <ul className="divide-y rounded-2xl border">
                    {contributions.slice(0, 6).map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>
                        <span className="font-medium tabular-nums">{formatCurrency(c.amount, c.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              title={user.status === "active" ? `Suspend ${user.name}?` : `Reactivate ${user.name}?`}
              description={
                user.status === "active"
                  ? "Suspended demo users are marked as such in the admin panel. Their existing requests remain until moderated."
                  : "The user will be marked active again."
              }
              confirmLabel={user.status === "active" ? "Suspend" : "Reactivate"}
              destructive={user.status === "active"}
              onConfirm={() => {
                const next = user.status === "active" ? "suspended" : "active";
                setUserStatus(user.id, next);
                toast.success(`${user.name} is now ${next}`);
              }}
            />
            <ConfirmDialog
              open={!!pendingRole}
              onOpenChange={(o) => !o && setPendingRole(null)}
              title={`Change role to ${pendingRole ?? ""}?`}
              description={`${user.name} will be shown as a ${pendingRole} in the demo admin panel.`}
              confirmLabel="Change role"
              onConfirm={() => {
                if (!pendingRole) return;
                setUserRole(user.id, pendingRole);
                toast.success(`${user.name} is now a ${pendingRole}`);
                setPendingRole(null);
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

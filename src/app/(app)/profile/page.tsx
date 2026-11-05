"use client";

import * as React from "react";
import { CalendarDays, FileText, HandHeart, Sparkles, Users } from "lucide-react";
import { RequireAuth } from "@/components/layout/require-auth";
import { PageContainer, StatCard } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { CountryLabel } from "@/components/requests/badges";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { DangerZoneCard, PreferencesCard, RoleCard, SafetyCard } from "@/components/profile/settings-cards";
import { formatCurrency, formatDate, toUsd } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useRequestsStore } from "@/store/requests-store";

function ImpactStats() {
  const session = useAuthStore((s) => s.session)!;
  const contributions = useContributionsStore((s) => s.contributions);
  const requests = useRequestsStore((s) => s.requests);

  if (session.role === "requester") {
    const mine = requests.filter((r) => r.userId === session.userId && r.status !== "withdrawn");
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Requests posted" value={mine.length} icon={FileText} tone="primary" />
        <StatCard label="Supporters" value={mine.reduce((s, r) => s + r.supporters, 0)} hint="Simulated supporters" icon={Users} />
        <StatCard label="Goals reached" value={mine.filter((r) => r.status === "completed").length} hint="Simulated" icon={Sparkles} />
      </div>
    );
  }

  const done = contributions.filter((c) => c.userId === session.userId && (c.status === "recorded" || c.status === "fulfilled"));
  const total = done.reduce((s, c) => s + toUsd(c.amount, c.currency), 0);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Simulated contributions" value={done.length} icon={HandHeart} tone="primary" />
      <StatCard label="Requests supported" value={new Set(done.map((c) => c.requestId)).size} hint="Distinct fictional requests" icon={Users} />
      <StatCard label="Simulated total" value={formatCurrency(total, "USD")} hint="≈ USD at demo rates" icon={Sparkles} />
    </div>
  );
}

function ProfileView() {
  const session = useAuthStore((s) => s.session)!;

  return (
    <PageContainer className="max-w-5xl">
      <section
        aria-label="Profile summary"
        className="relative mb-8 overflow-hidden rounded-3xl border bg-hero p-6 text-white shadow-lift sm:p-8"
      >
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <DemoAvatar seed={session.image} label={session.name} className="size-24 ring-4 ring-white/20 sm:size-28" />
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{session.name}</h1>
              <span className="rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-medium capitalize text-mint">{session.role}</span>
              <span className="rounded-full border border-dashed border-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                Demo account
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
              <CountryLabel country={session.country} />
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Member since {formatDate(session.memberSince, { month: "long", year: "numeric" })}
              </span>
            </div>
            <p className="max-w-xl text-sm text-white/85">{session.bio || "No biography yet — add one below."}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="impact" className="mb-8">
        <h2 id="impact" className="mb-4 text-lg font-semibold tracking-tight">
          Public impact statistics
        </h2>
        <ImpactStats />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <EditProfileForm session={session} />
          <RoleCard session={session} />
        </div>
        <div className="grid content-start gap-6">
          <PreferencesCard />
          <SafetyCard session={session} />
        </div>
      </div>
      <div className="mt-6">
        <DangerZoneCard session={session} />
      </div>
    </PageContainer>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileView />
    </RequireAuth>
  );
}

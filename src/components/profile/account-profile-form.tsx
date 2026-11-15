"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import type { Session } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/constants";
import { profileSchema, type ProfileInput } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { saveAvatarAction, updateProfileAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, FieldError, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";

const AVATAR_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Profile editor for real (Supabase) accounts. Saves through server actions under RLS. */
export function AccountProfileForm({ session }: { session: Session }) {
  const router = useRouter();
  const adopt = useAuthStore((s) => s.adoptSupabaseSession);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session.name,
      bio: session.bio,
      country: session.country ?? null,
      preferredCurrency: session.preferredCurrency ?? null,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = async (v: ProfileInput) => {
    const res = await updateProfileAction(v);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    adopt(res.profile);
    form.reset(v);
    toast.success("Profile saved");
    router.refresh();
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return toast.error("Use a PNG, JPEG or WebP image.");
    if (file.size > AVATAR_MAX_BYTES) return toast.error("Images must be 2 MB or smaller.");
    setUploading(true);
    try {
      // Uploads go to the user's own folder; Storage RLS rejects any other path.
      const path = `${session.userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const res = await saveAvatarAction(path);
      if (!res.ok) throw new Error(res.error);
      adopt(res.profile);
      toast.success("Profile photo updated");
      router.refresh();
    } catch {
      toast.error("Couldn't upload that image. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    const res = await saveAvatarAction(null);
    if (!res.ok) return toast.error(res.error);
    adopt(res.profile);
    toast.success("Profile photo removed");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>Your name and photo are shown on requests you share. Your email is never shown publicly.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar-file" onChange={(e) => onAvatar(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Camera />} {session.avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          {session.avatarUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={removeAvatar} disabled={uploading}>
              <Trash2 /> Remove
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" aria-busy={isSubmitting}>
          <div className="grid gap-2">
            <Label htmlFor="ap-name">Full name</Label>
            <Input id="ap-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="ap-name-err" {...form.register("name")} />
            <FieldError id="ap-name-err" message={errors.name?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ap-email">Email</Label>
            <Input id="ap-email" value={session.email || "Hidden for privacy"} readOnly disabled aria-describedby="ap-email-hint" />
            <p id="ap-email-hint" className="text-xs text-muted-foreground">Your sign-in email can&apos;t be changed here yet.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ap-country">Country</Label>
              <NativeSelect
                id="ap-country"
                value={form.watch("country") ?? ""}
                onChange={(e) => form.setValue("country", (e.target.value || null) as ProfileInput["country"], { shouldDirty: true })}
              >
                <option value="">Not set</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap-currency">Preferred currency</Label>
              <NativeSelect
                id="ap-currency"
                value={form.watch("preferredCurrency") ?? ""}
                aria-describedby="ap-currency-hint"
                onChange={(e) =>
                  form.setValue("preferredCurrency", (e.target.value || null) as ProfileInput["preferredCurrency"], { shouldDirty: true })
                }
              >
                <option value="">Not set</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </NativeSelect>
              <p id="ap-currency-hint" className="text-xs text-muted-foreground">Requests always show their own currency.</p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ap-bio">Bio</Label>
            <Textarea id="ap-bio" rows={4} maxLength={500} aria-invalid={!!errors.bio} aria-describedby="ap-bio-err" {...form.register("bio")} />
            <FieldError id="ap-bio-err" message={errors.bio?.message} />
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty} className="justify-self-start">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

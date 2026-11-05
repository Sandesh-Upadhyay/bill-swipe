"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImageUp, Loader2, RotateCcw } from "lucide-react";
import type { Session } from "@/lib/types";
import { COUNTRIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, FieldError, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";

const COUNTRY_CODES = ["US", "GB", "CA", "AU", "IN", "AE", "DE", "FR"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Display name must be at least 2 characters").max(40, "Keep it under 40 characters"),
  country: z.enum(COUNTRY_CODES, { message: "Choose a country" }),
  bio: z.string().trim().max(160, "Bio must be 160 characters or fewer"),
  image: z.string().min(1),
});
type Values = z.infer<typeof schema>;

const MAX_BYTES = 2 * 1024 * 1024;

/** Reads an image file and returns a 160px square JPEG data URL (center-cropped). */
function resizeImage(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Image processing isn't supported in this browser."));
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function EditProfileForm({ session }: { session: Session }) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const users = useAdminStore((s) => s.users);
  const upsertUser = useAdminStore((s) => s.upsertUser);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = React.useState<string>();
  const [processing, setProcessing] = React.useState(false);

  const defaults = React.useCallback(
    (): Values => ({ name: session.name, country: session.country, bio: session.bio ?? "", image: session.image }),
    [session.name, session.country, session.bio, session.image],
  );
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting, isDirty } = form.formState;
  const image = form.watch("image");
  const bio = form.watch("bio") ?? "";

  React.useEffect(() => {
    form.reset(defaults());
  }, [defaults, form]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPhotoError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Please choose an image file (JPG, PNG, WebP).");
    if (file.size > MAX_BYTES) return setPhotoError("Image must be 2 MB or smaller.");
    setProcessing(true);
    try {
      const url = await resizeImage(file);
      form.setValue("image", url, { shouldDirty: true });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't process that image.");
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 350));
    updateProfile({ name: v.name, country: v.country, bio: v.bio, image: v.image });
    const existing = users.find((u) => u.id === session.userId);
    upsertUser({
      id: session.userId,
      email: session.email,
      role: session.role,
      memberSince: session.memberSince,
      status: existing?.status ?? "active",
      name: v.name,
      country: v.country,
      bio: v.bio,
      image: v.image,
    });
    toast.success("Profile updated");
    form.reset(v);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <CardDescription>Your public display details. Use a first name and initial — never share your full address or ID.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <DemoAvatar seed={image} label="Profile photo preview" className="size-20 ring-4 ring-primary/15" />
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={processing}>
                  {processing ? <Loader2 className="animate-spin" /> : <ImageUp />} Upload photo
                </Button>
                {image !== session.userId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue("image", session.userId, { shouldDirty: true })}
                  >
                    <RotateCcw /> Use illustration
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP up to 2 MB. Resized in your browser and stored only locally.</p>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} aria-label="Upload profile photo" />
              <FieldError message={photoError} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Display name</Label>
              <Input id="profile-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-country">Country</Label>
              <NativeSelect id="profile-country" aria-invalid={!!errors.country} {...form.register("country")}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={errors.country?.message} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-bio">Short biography</Label>
                <span className={`text-xs tabular-nums ${bio.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{bio.length}/160</span>
              </div>
              <Textarea id="profile-bio" className="min-h-24" placeholder="A sentence or two about you." aria-invalid={!!errors.bio} {...form.register("bio")} />
              <FieldError message={errors.bio?.message} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={!isDirty} onClick={() => form.reset(defaults())}>
              Discard
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

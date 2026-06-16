"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQbConfig, useSaveQbConfig } from "@/hooks/use-integrations";
import { toast } from "sonner";

const schema = z.object({
  companyName:     z.string().min(1, "Required"),
  defaultLocation: z.string().min(1, "Required"),
  notes:           z.string(),
});

type FormValues = z.infer<typeof schema>;

export function QbConfigForm() {
  const { data, isLoading } = useQbConfig();
  const { mutate, isPending } = useSaveQbConfig();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: "", defaultLocation: "BF Warehouse", notes: "" },
  });

  useEffect(() => {
    if (data?.config) reset(data.config);
  }, [data, reset]);

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => toast.success("QuickBooks settings saved"),
      onError:   () => toast.error("Failed to save settings"),
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company name</Label>
        <Input id="companyName" placeholder="Beauty First Salon" {...register("companyName")} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="defaultLocation">Default location</Label>
        <Input id="defaultLocation" placeholder="BF Warehouse" {...register("defaultLocation")} />
        <p className="text-xs text-muted-foreground">Used when no location is specified during sync.</p>
        {errors.defaultLocation && <p className="text-xs text-destructive">{errors.defaultLocation.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} placeholder="Optional notes about this QB integration…" {...register("notes")} />
      </div>

      {data?.lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(data.lastSyncAt).toLocaleString()}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

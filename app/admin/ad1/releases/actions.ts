"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { releaseSchema, releaseText, RELEASE_VERSION } from "@/lib/testimonials/release";
import { revalidatePath } from "next/cache";
import { z } from "zod";
export async function saveRelease(input: unknown) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return {error:"Please sign in as an authorised administrator before collecting consent."};
  const parsed = releaseSchema.safeParse(input);
  if (!parsed.success) return {error:parsed.error.issues[0].message};
  const v = parsed.data;
  const { error } = await createAdminClient().from("testimonial_releases").insert({id:v.id, full_name:v.fullName, date_of_birth:v.dob, role:v.role, signature:v.signature, release_version:RELEASE_VERSION, release_text:releaseText, recorded_by:user.id});
  if (error) {
    // A retry of the same form must not create a second consent record.
    if (error.code === "23505") return {error:"This form may already have been saved. Check saved releases before signing again."};
    return {error:"The consent was not saved. Please try again; do not treat this as signed until you see confirmation."};
  }
  revalidatePath("/admin/ad1/releases");
  return {id:v.id};
}
export async function withdrawRelease(id: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return {error:"Please sign in as an authorised administrator."};
  if (!z.string().uuid().safeParse(id).success) return {error:"Invalid release."};
  const {data,error} = await createAdminClient().from("testimonial_releases").update({withdrawn_at:new Date().toISOString(),withdrawn_by:user.id}).eq("id",id).is("withdrawn_at",null).select("id");
  if (error || !data?.length) return {error:"Could not record withdrawal, or it is already withdrawn. Reload to check. Stop using the testimonial regardless."};
  revalidatePath("/admin/ad1/releases");
  return {ok:true};
}

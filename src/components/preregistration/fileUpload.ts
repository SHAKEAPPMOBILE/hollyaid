import { preregSupabase } from "@/components/preregistration/supabase";

export async function uploadPublicFile(params: {
  file: File;
  bucket: string;
  path: string;
}) {
  const { file, bucket, path } = params;

  const { error } = await preregSupabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = preregSupabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

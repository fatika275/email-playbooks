import { getSupabaseBrowserClient } from "@/lib/supabase";

export type ProspectFileRecord = {
  id: string;
  prospectId: string;
  title: string;
  kind: string;
  url: string;
  folder: string;
  note: string;
  createdAt: string;
};

type ProspectFileRow = {
  id: string;
  user_id: string;
  prospect_id: string;
  title: string;
  kind: string;
  url: string | null;
  folder: string;
  note: string | null;
  created_at: string;
};

function normalizeClientFolderFileError(error: unknown) {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : error instanceof Error
        ? error.message
        : "Client files could not be loaded.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("client_folder_files") ||
    (normalized.includes("relation") && normalized.includes("does not exist"))
  ) {
    return new Error(
      "Run supabase/client-folder-files.sql in Supabase before saving client files and links."
    );
  }

  return new Error(message);
}

function mapFileRow(row: ProspectFileRow): ProspectFileRecord {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    title: row.title,
    kind: row.kind,
    url: row.url ?? "",
    folder: row.folder,
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

export async function listClientFolderFiles(prospectId?: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  let query = client
    .from("client_folder_files")
    .select("id, user_id, prospect_id, title, kind, url, folder, note, created_at")
    .order("created_at", { ascending: false });

  if (prospectId) {
    query = query.eq("prospect_id", prospectId);
  }

  const { data, error } = await query;
  if (error) throw normalizeClientFolderFileError(error);
  return ((data ?? []) as ProspectFileRow[]).map(mapFileRow);
}

export async function saveClientFolderFile(
  file: Omit<ProspectFileRecord, "createdAt"> & { createdAt?: string }
) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Client files are temporarily unavailable.");
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Sign in before saving client files and links.");
  }

  const { data, error } = await client
    .from("client_folder_files")
    .upsert({
      id: file.id,
      user_id: user.id,
      prospect_id: file.prospectId,
      title: file.title,
      kind: file.kind,
      url: file.url || null,
      folder: file.folder,
      note: file.note || null,
      created_at: file.createdAt ?? new Date().toISOString(),
    })
    .select("id, user_id, prospect_id, title, kind, url, folder, note, created_at")
    .single();

  if (error) throw normalizeClientFolderFileError(error);
  return mapFileRow(data as ProspectFileRow);
}

export async function deleteClientFolderFile(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Client files are temporarily unavailable.");
  }

  const { error } = await client.from("client_folder_files").delete().eq("id", id);
  if (error) throw normalizeClientFolderFileError(error);
}

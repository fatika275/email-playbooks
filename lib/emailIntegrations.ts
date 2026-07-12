import crypto from "crypto";
import { getUserFromAccessToken } from "@/lib/server-auth";

export type EmailProvider = "gmail" | "outlook";

type ServerConfig = {
  siteUrl: string;
  supabaseUrl: string;
  serviceRoleKey: string;
};

type StoredIntegration = {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: string | null;
  sync_cursor: string | null;
  status: string;
};

type ProviderMessage = {
  id: string;
  fromEmail: string;
  fromName?: string;
  subject?: string;
  receivedAt?: string;
};

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
const OUTLOOK_SCOPE = "offline_access User.Read Mail.Read";

function getConfig(): ServerConfig {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!siteUrl || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Email integration server environment variables are missing.");
  }
  return {
    siteUrl: siteUrl.startsWith("http") ? siteUrl.replace(/\/$/, "") : `https://${siteUrl}`,
    supabaseUrl: supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""),
    serviceRoleKey,
  };
}

function getHeaders(config = getConfig()) {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json",
  };
}

function getEncryptionKey() {
  const secret = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is missing.");
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored email token is invalid.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function signState(payload: { userId: string; provider: EmailProvider; nonce: string }) {
  const secret = process.env.EMAIL_OAUTH_STATE_SECRET || process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("EMAIL_OAUTH_STATE_SECRET is missing.");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyState(state: string) {
  const secret = process.env.EMAIL_OAUTH_STATE_SECRET || process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("EMAIL_OAUTH_STATE_SECRET is missing.");
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("Email connection state is invalid.");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    provided.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(provided, expectedBuffer)
  ) {
    throw new Error("Email connection state could not be verified.");
  }
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId: string;
    provider: EmailProvider;
  };
}

export async function getEmailUserFromRequest(request: Request) {
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!accessToken) throw new Error("Sign in before changing email integrations.");
  return getUserFromAccessToken(accessToken);
}

export function buildEmailConnectUrl(options: { userId: string; provider: EmailProvider }) {
  const config = getConfig();
  const state = signState({
    userId: options.userId,
    provider: options.provider,
    nonce: crypto.randomBytes(16).toString("base64url"),
  });

  if (options.provider === "gmail") {
    const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_EMAIL_CLIENT_ID is missing.");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${config.siteUrl}/api/email-integrations/gmail/callback`,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: GMAIL_SCOPE,
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const clientId = process.env.MICROSOFT_EMAIL_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_EMAIL_CLIENT_ID is missing.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${config.siteUrl}/api/email-integrations/outlook/callback`,
    response_type: "code",
    response_mode: "query",
    scope: OUTLOOK_SCOPE,
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

async function exchangeOAuthCode(provider: EmailProvider, code: string) {
  const config = getConfig();
  const isGmail = provider === "gmail";
  const tokenUrl = isGmail
    ? "https://oauth2.googleapis.com/token"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const clientId = isGmail
    ? process.env.GOOGLE_EMAIL_CLIENT_ID
    : process.env.MICROSOFT_EMAIL_CLIENT_ID;
  const clientSecret = isGmail
    ? process.env.GOOGLE_EMAIL_CLIENT_SECRET
    : process.env.MICROSOFT_EMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error(`${provider} OAuth credentials are missing.`);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${config.siteUrl}/api/email-integrations/${provider}/callback`,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || `${provider} did not return an access token.`);
  }
  return data;
}

async function refreshAccessToken(integration: StoredIntegration) {
  if (!integration.refresh_token_encrypted) return decrypt(integration.access_token_encrypted);
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;
  if (expiresAt && expiresAt > Date.now() + 60_000) {
    return decrypt(integration.access_token_encrypted);
  }

  const isGmail = integration.provider === "gmail";
  const clientId = isGmail
    ? process.env.GOOGLE_EMAIL_CLIENT_ID
    : process.env.MICROSOFT_EMAIL_CLIENT_ID;
  const clientSecret = isGmail
    ? process.env.GOOGLE_EMAIL_CLIENT_SECRET
    : process.env.MICROSOFT_EMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error(`${integration.provider} OAuth credentials are missing.`);

  const tokenUrl = isGmail
    ? "https://oauth2.googleapis.com/token"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decrypt(integration.refresh_token_encrypted),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Email token refresh failed.");

  await upsertIntegrationTokens({
    ...integration,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || decrypt(integration.refresh_token_encrypted),
    expiresIn: data.expires_in,
  });
  return data.access_token;
}

async function fetchProviderProfile(provider: EmailProvider, accessToken: string) {
  const url =
    provider === "gmail"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
      : "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName,displayName";
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await response.json()) as {
    emailAddress?: string;
    id?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  if (!response.ok) throw new Error("Email account profile could not be loaded.");
  return {
    email: provider === "gmail" ? data.emailAddress || "" : data.mail || data.userPrincipalName || "",
    providerAccountId: data.id || data.emailAddress || data.userPrincipalName || null,
  };
}

async function upsertIntegrationTokens(options: StoredIntegration & {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
}) {
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/email_integrations?id=eq.${encodeURIComponent(options.id)}`,
    {
      method: "PATCH",
      headers: getHeaders(config),
      body: JSON.stringify({
        access_token_encrypted: encrypt(options.accessToken),
        refresh_token_encrypted: options.refreshToken ? encrypt(options.refreshToken) : options.refresh_token_encrypted,
        token_expires_at: options.expiresIn
          ? new Date(Date.now() + options.expiresIn * 1000).toISOString()
          : options.token_expires_at,
        status: "active",
        last_error: null,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) throw new Error(await response.text());
}

export async function completeEmailOAuthCallback(provider: EmailProvider, code: string, state: string) {
  const verified = verifyState(state);
  if (verified.provider !== provider) throw new Error("Email provider did not match the connection state.");
  const token = await exchangeOAuthCode(provider, code);
  const profile = await fetchProviderProfile(provider, token.access_token!);
  if (!profile.email) throw new Error("The connected email account did not return an email address.");
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/email_integrations?on_conflict=user_id,provider,email`,
    {
      method: "POST",
      headers: { ...getHeaders(config), prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: verified.userId,
        provider,
        email: profile.email.toLowerCase(),
        provider_account_id: profile.providerAccountId,
        access_token_encrypted: encrypt(token.access_token!),
        refresh_token_encrypted: token.refresh_token ? encrypt(token.refresh_token) : null,
        token_expires_at: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null,
        scopes: token.scope,
        status: "active",
        last_error: null,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) throw new Error(await response.text());
}

export async function listEmailIntegrations(userId: string) {
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/email_integrations?select=id,provider,email,status,last_sync_at,last_error,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
    { headers: getHeaders(config), cache: "no-store" }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<Array<{
    id: string;
    provider: EmailProvider;
    email: string;
    status: string;
    last_sync_at: string | null;
    last_error: string | null;
    created_at: string;
  }>>;
}

async function listStoredIntegrations(userId?: string) {
  const config = getConfig();
  const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/email_integrations?select=*&status=eq.active${filter}`,
    { headers: getHeaders(config), cache: "no-store" }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<StoredIntegration[]>;
}

function parseEmailAddress(value?: string) {
  const text = value || "";
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch?.[0]?.toLowerCase() || "";
  const name = emailMatch ? text.replace(emailMatch[0], "").replace(/[<>"']/g, "").trim() : "";
  return { email, name };
}

async function fetchGmailMessages(accessToken: string): Promise<ProviderMessage[]> {
  const listResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX",
    { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  const list = (await listResponse.json()) as { messages?: Array<{ id: string }> };
  if (!listResponse.ok) throw new Error("Gmail inbox metadata could not be loaded.");
  const messages = await Promise.all(
    (list.messages ?? []).map(async (message) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" }
      );
      const data = (await response.json()) as {
        id: string;
        internalDate?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      if (!response.ok) return null;
      const headers = Object.fromEntries(
        (data.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value])
      );
      const from = parseEmailAddress(headers.from);
      if (!from.email) return null;
      return {
        id: data.id,
        fromEmail: from.email,
        fromName: from.name,
        subject: headers.subject,
        receivedAt: data.internalDate
          ? new Date(Number(data.internalDate)).toISOString()
          : headers.date
            ? new Date(headers.date).toISOString()
            : undefined,
      };
    })
  );
  return messages.filter(Boolean) as ProviderMessage[];
}

async function fetchOutlookMessages(accessToken: string): Promise<ProviderMessage[]> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from",
    { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  const data = (await response.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      receivedDateTime?: string;
      from?: { emailAddress?: { address?: string; name?: string } };
    }>;
  };
  if (!response.ok) throw new Error("Outlook inbox metadata could not be loaded.");
  return (data.value ?? [])
    .map((message) => ({
      id: message.id,
      fromEmail: message.from?.emailAddress?.address?.toLowerCase() || "",
      fromName: message.from?.emailAddress?.name,
      subject: message.subject,
      receivedAt: message.receivedDateTime,
    }))
    .filter((message) => message.fromEmail);
}

async function matchProspect(userId: string, fromEmail: string) {
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/prospects?select=id,full_name,company,stage,next_follow_up,email&owner_id=eq.${encodeURIComponent(userId)}&email=ilike.${encodeURIComponent(fromEmail)}&limit=1`,
    { headers: getHeaders(config), cache: "no-store" }
  );
  if (!response.ok) throw new Error(await response.text());
  const rows = (await response.json()) as Array<{
    id: string;
    full_name: string;
    company: string;
    stage: string;
  }>;
  return rows[0] ?? null;
}

async function recordReply(integration: StoredIntegration, message: ProviderMessage) {
  const prospect = await matchProspect(integration.user_id, message.fromEmail);
  if (!prospect) return false;
  const config = getConfig();
  const existingResponse = await fetch(
    `${config.supabaseUrl}/rest/v1/email_reply_events?select=id&integration_id=eq.${encodeURIComponent(integration.id)}&provider_message_id=eq.${encodeURIComponent(message.id)}&limit=1`,
    { headers: getHeaders(config), cache: "no-store" }
  );
  if (!existingResponse.ok) throw new Error(await existingResponse.text());
  const existing = (await existingResponse.json()) as Array<{ id: string }>;
  if (existing.length) return false;

  const eventResponse = await fetch(
    `${config.supabaseUrl}/rest/v1/email_reply_events?on_conflict=integration_id,provider_message_id`,
    {
      method: "POST",
      headers: { ...getHeaders(config), prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        integration_id: integration.id,
        user_id: integration.user_id,
        prospect_id: prospect.id,
        provider_message_id: message.id,
        from_email: message.fromEmail,
        from_name: message.fromName ?? null,
        subject: message.subject ?? null,
        received_at: message.receivedAt ?? null,
      }),
    }
  );
  if (!eventResponse.ok) throw new Error(await eventResponse.text());

  const updateResponse = await fetch(
    `${config.supabaseUrl}/rest/v1/prospects?id=eq.${encodeURIComponent(prospect.id)}`,
    {
      method: "PATCH",
      headers: getHeaders(config),
      body: JSON.stringify({
        stage: ["won", "lost"].includes(prospect.stage) ? prospect.stage : "replied",
        next_follow_up: null,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!updateResponse.ok) throw new Error(await updateResponse.text());

  const activityResponse = await fetch(`${config.supabaseUrl}/rest/v1/prospect_activities`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify({
      prospect_id: prospect.id,
      created_by: integration.user_id,
      activity_type: "email",
      summary: `Reply detected from ${message.fromEmail}${message.subject ? `: ${message.subject}` : ""}`,
    }),
  });
  if (!activityResponse.ok) throw new Error(await activityResponse.text());
  return true;
}

async function markIntegrationSync(integration: StoredIntegration, error?: string) {
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/email_integrations?id=eq.${encodeURIComponent(integration.id)}`,
    {
      method: "PATCH",
      headers: getHeaders(config),
      body: JSON.stringify({
        last_sync_at: new Date().toISOString(),
        last_error: error || null,
        status: error ? "needs_reconnect" : "active",
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) throw new Error(await response.text());
}

export async function syncEmailReplies(userId?: string) {
  const integrations = await listStoredIntegrations(userId);
  let matched = 0;
  let checked = 0;
  for (const integration of integrations) {
    try {
      const accessToken = await refreshAccessToken(integration);
      const messages =
        integration.provider === "gmail"
          ? await fetchGmailMessages(accessToken)
          : await fetchOutlookMessages(accessToken);
      checked += messages.length;
      for (const message of messages) {
        if (await recordReply(integration, message)) matched += 1;
      }
      await markIntegrationSync(integration);
    } catch (error) {
      await markIntegrationSync(
        integration,
        error instanceof Error ? error.message : "Email sync failed."
      );
    }
  }
  return { integrations: integrations.length, checked, matched };
}

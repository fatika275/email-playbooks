function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type HtmlExportOptions = {
  companyName?: string;
  logoUrl?: string;
};

export function buildEmailHtml(
  subject: string,
  body: string,
  options?: HtmlExportOptions
) {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");
  const safeCompanyName = options?.companyName
    ? escapeHtml(options.companyName)
    : "Thalovo";

  const safeLogoUrl = options?.logoUrl || "";

  const logoBlock = safeLogoUrl
    ? `<img src="${safeLogoUrl}" alt="${safeCompanyName} logo" style="max-height:52px; max-width:180px; display:block; margin-bottom:14px;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
  <div style="max-width:700px; margin:40px auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
    <div style="padding:28px; background:#111827; color:#ffffff;">
      ${logoBlock}
      <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.75; margin-bottom:8px;">
        ${safeCompanyName}
      </div>
      <h1 style="margin:0; font-size:28px; line-height:1.2;">${safeSubject}</h1>
    </div>

    <div style="padding:28px; font-size:16px; line-height:1.8; color:#1f2937;">
      ${safeBody}
    </div>

    <div style="padding:18px 28px; border-top:1px solid #e5e7eb; background:#fafafa; color:#6b7280; font-size:13px;">
      Exported from ${safeCompanyName}
    </div>
  </div>
</body>
</html>`;
}

export function downloadHtmlFile(
  subject: string,
  body: string,
  filename?: string,
  options?: HtmlExportOptions
) {
  const html = buildEmailHtml(subject, body, options);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const safeName =
    filename ||
    subject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    "email-export";

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

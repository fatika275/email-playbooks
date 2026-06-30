function safeFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "email-draft"
  );
}

export function openGmailDraft(subject: string, body: string) {
  const query = new URLSearchParams({
    view: "cm",
    fs: "1",
    su: subject,
    body,
  });
  window.open(`https://mail.google.com/mail/?${query.toString()}`, "_blank", "noopener,noreferrer");
}

export function openOutlookDraft(subject: string, body: string) {
  const query = new URLSearchParams({ subject, body });
  window.open(
    `https://outlook.office.com/mail/deeplink/compose?${query.toString()}`,
    "_blank",
    "noopener,noreferrer"
  );
}

export function downloadEmlFile(subject: string, body: string, filename: string) {
  const normalizedBody = body.replace(/\r?\n/g, "\r\n");
  const content = [
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizedBody,
  ].join("\r\n");
  const blob = new Blob([content], { type: "message/rfc822;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(filename)}.eml`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

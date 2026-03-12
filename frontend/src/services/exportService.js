// Download a string as a file
function download(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(iso) {
  if (!iso) return "Unknown date";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// Export all journal entries as a single Markdown file
export function exportJournalAsMarkdown(entries) {
  if (!entries || entries.length === 0) return;

  const lines = [
    "# Serenity Journal",
    "",
    `*Exported on ${formatDate(new Date().toISOString())}*`,
    `*${entries.length} ${entries.length === 1 ? "entry" : "entries"}*`,
    "",
    "---",
    "",
  ];

  entries.forEach((entry, i) => {
    const date = formatDate(entry.created_at || entry.date);
    const title = entry.title || `Entry ${i + 1}`;
    const emotion = entry.emotion || entry.mood || null;
    const content = entry.content || entry.body || "";
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const source = entry.auto_extract ? "AI Extracted" : "Handwritten";

    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`**Date:** ${date}  `);
    if (emotion) lines.push(`**Mood:** ${emotion}  `);
    lines.push(`**Source:** ${source}  `);
    if (tags.length > 0) lines.push(`**Tags:** ${tags.join(", ")}  `);
    lines.push("");
    lines.push(content);
    lines.push("");
    if (i < entries.length - 1) lines.push("---", "");
  });

  const slug = new Date().toISOString().split("T")[0];
  download(`serenity-journal-${slug}.md`, lines.join("\n"), "text/markdown");
}

// Export a single conversation as Markdown
export function exportConversationAsMarkdown(messages, conversationTitle) {
  if (!messages || messages.length === 0) return;

  const title = conversationTitle || "Serenity Conversation";
  const slug = new Date().toISOString().split("T")[0];

  const lines = [
    `# ${title}`,
    "",
    `*Exported on ${formatDate(new Date().toISOString())}*`,
    "",
    "---",
    "",
  ];

  messages.forEach((msg) => {
    const role = msg.role === "user" ? "**You**" : "**Serenity**";
    const time = msg.created_at ? formatDate(msg.created_at) : "";
    if (time) lines.push(`### ${role} — ${time}`);
    else lines.push(`### ${role}`);
    lines.push("");
    lines.push(msg.content || "");
    lines.push("");
  });

  download(
    `serenity-conversation-${slug}.md`,
    lines.join("\n"),
    "text/markdown"
  );
}

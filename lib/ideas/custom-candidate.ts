export function validateCustomIdeaInput(titleValue: string, urlValue: string) {
  const title = titleValue.trim();
  if (!title || title.length > 120) throw new Error("Invalid title");
  const url = new URL(urlValue.trim());
  if (url.protocol !== "https:") throw new Error("HTTPS required");
  return { title, url: url.href };
}

export function parseChatId(chatId: string): number | null {
  const id = Number(chatId);
  if (isNaN(id)) return null;
  return id;
}

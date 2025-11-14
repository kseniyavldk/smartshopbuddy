import { useEffect } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

export function PurchaseHistory() {
  const {
    archiveItems,
    isLoading,
    chatId,
    fetchArchive,
    restoreFromArchive,
    removeItem,
  } = useShoppingStore();

  useEffect(() => {
    if (chatId) {
      fetchArchive();
    }
  }, [chatId, fetchArchive]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {archiveItems.length === 0 ? (
        <p className="text-gray-400 italic text-center">
          Пока нет архивированных товаров.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
          {archiveItems.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center px-4 py-3"
              style={{ backgroundColor: "#fff", color: "#111" }}
            >
              <span style={{ color: "#111", textDecoration: "line-through" }}>
                {item.text}
              </span>
              <div className="flex gap-2">
                <button
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                  onClick={() => restoreFromArchive(item.id)}
                >
                  🔄
                </button>
                <button
                  className="text-red-500 hover:text-red-700 transition-colors"
                  onClick={() => removeItem(item.id)}
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

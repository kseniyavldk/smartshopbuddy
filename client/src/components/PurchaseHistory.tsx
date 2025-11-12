import { useEffect } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

export function PurchaseHistory() {
  const { archiveItems, isLoading, chatId, fetchArchive, restoreFromArchive } =
    useShoppingStore();

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
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        📦 История покупок
      </h2>

      {archiveItems.length === 0 ? (
        <p className="text-gray-400 italic text-center">
          Пока нет архивированных товаров.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {archiveItems.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center px-4 py-3"
            >
              <span className="text-gray-700 dark:text-gray-300 line-through">
                {item.text}
              </span>
              <button
                className="text-blue-500 hover:text-blue-700 transition-colors"
                onClick={() => {
                  restoreFromArchive(item.id);
                }}
              >
                🔄 Вернуть
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

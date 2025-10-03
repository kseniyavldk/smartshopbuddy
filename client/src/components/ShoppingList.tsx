import { useShoppingStore } from "../hooks/useShoppingStore";
import { ShoppingItem } from "./ShoppingItem";
import type { Item } from "../types/types";

export function ShoppingList() {
  const items = useShoppingStore((state) => state.items);
  const isLoading = useShoppingStore((state) => state.isLoading);
  const toggleBought = useShoppingStore((state) => state.toggleBought);
  const removeItem = useShoppingStore((state) => state.removeItem);

  return (
    <div>
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {items.length === 0 && !isLoading ? (
        <p className="p-4 text-center text-gray-400 italic">
          📝 Список пуст. Добавьте первый товар!
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {items.map((item: Item) => (
            <ShoppingItem
              key={item.id}
              item={item}
              onToggle={toggleBought}
              onRemove={removeItem}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

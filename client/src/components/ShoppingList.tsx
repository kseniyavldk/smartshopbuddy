import { useShoppingStore } from "../hooks/useShoppingStore";
import { ShoppingItem } from "./ShoppingItem";
import type { Item } from "../types/types";

export function ShoppingList() {
  const items = useShoppingStore((state) => state.items);
  const toggleBought = useShoppingStore((state) => state.toggleBought);
  const removeItem = useShoppingStore((state) => state.removeItem);

  if (items.length === 0) {
    return (
      <p className="p-4 text-center text-gray-400 italic">
        📝 Список пуст. Добавьте первый товар!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
      {items.map((item: Item) => (
        <ShoppingItem
          key={item.id}
          item={item}
          onToggle={toggleBought}
          onRemove={removeItem}
        />
      ))}
    </ul>
  );
}

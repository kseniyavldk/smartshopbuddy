import { useShoppingStore } from "../hooks/useShoppingStore";
import { ShoppingItem } from "./ShoppingItem";
import type { Item } from "../types/types";

export function ShoppingList() {
  const items = useShoppingStore((state) => state.items);
  const toggleBought = useShoppingStore((state) => state.toggleBought);
  const removeItem = useShoppingStore((state) => state.removeItem);

  if (items.length === 0) {
    return <p className="p-4 text-center text-gray-500">Список пуст</p>;
  }

  return (
    <ul className="divide-y border rounded">
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

import type { Item } from "../types/types";

interface ShoppingItemProps {
  item: Item;
  onToggle: (id: string | number) => void;
  onRemove: (id: string | number) => void;
}

export function ShoppingItem({ item, onToggle, onRemove }: ShoppingItemProps) {
  return (
    <li className="flex items-center justify-between p-2 border-b">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={item.bought}
          onChange={() => onToggle(item.id)}
        />
        <span className={item.bought ? "line-through text-gray-500" : ""}>
          {item.text}
        </span>
      </label>
      <button
        onClick={() => onRemove(item.id)}
        className="text-red-500 hover:text-red-700"
        aria-label="Удалить"
      >
        ×
      </button>
    </li>
  );
}

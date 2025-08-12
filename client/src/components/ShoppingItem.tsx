import type { Item } from "../types/types";

interface ShoppingItemProps {
  item: Item;
  onToggle: (id: string | number) => void;
  onRemove: (id: string | number) => void;
}

export function ShoppingItem({ item, onToggle, onRemove }: ShoppingItemProps) {
  return (
    <li className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
      <label className="flex items-center gap-3 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={item.bought}
          onChange={() => onToggle(item.id)}
          className="w-5 h-5 accent-blue-500"
        />
        <span
          className={`truncate ${
            item.bought ? "line-through text-gray-400" : "text-gray-800"
          }`}
        >
          {item.text}
        </span>
      </label>
      <button
        onClick={() => onRemove(item.id)}
        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
        aria-label="Удалить"
      >
        ✕
      </button>
    </li>
  );
}

import type { Item } from "../types/types";

interface Props {
  item: Item;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ShoppingItem({ item, onToggle, onRemove }: Props) {
  return (
    <li className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
      <label className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">
        <input
          type="checkbox"
          checked={item.bought}
          onChange={() => onToggle(String(item.id))}
          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span
          className={`text-gray-900 text-sm ${
            item.bought ? "line-through text-gray-400" : ""
          }`}
        >
          {item.text}
        </span>
      </label>
      <button
        onClick={() => onRemove(String(item.id))}
        className="text-red-500 hover:text-red-700 transition-colors text-lg"
        aria-label="Удалить товар"
      >
        ❌
      </button>
    </li>
  );
}

import type { Item } from "../types/types";

interface Props {
  item: Item;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ShoppingItem({ item, onToggle, onRemove }: Props) {
  return (
    <li className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-md">
      <div className="flex items-center">
        {/* Чекбокс */}
        <input
          id={`checkbox-${item.id}`}
          type="checkbox"
          checked={item.bought}
          onChange={() => onToggle(String(item.id))}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        {/* Текст */}
        <label
          htmlFor={`checkbox-${item.id}`}
          className={`ms-2 text-sm font-medium text-gray-900 dark:text-gray-300 ${
            item.bought ? "line-through text-gray-400" : ""
          }`}
        >
          {item.text}
        </label>
      </div>

      {/* Кнопка удаления */}
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

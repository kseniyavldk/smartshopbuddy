import { motion } from "framer-motion";
import type { Item } from "../types/types";

interface Props {
  item: Item;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ShoppingItem({ item, onToggle, onRemove }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-md"
    >
      <div className="flex items-center">
        <input
          id={`checkbox-${item.id}`}
          type="checkbox"
          checked={item.bought}
          onChange={() => onToggle(String(item.id))}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 focus:ring-2"
        />
        <label
          htmlFor={`checkbox-${item.id}`}
          className={`ms-2 text-sm font-medium text-gray-900 ${
            item.bought ? "line-through text-gray-400" : ""
          }`}
        >
          {item.text}
        </label>
      </div>

      <button
        onClick={() => onRemove(String(item.id))}
        className="text-red-500 hover:text-red-700 transition-colors text-lg"
        aria-label="Удалить товар"
      >
        ❌
      </button>
    </motion.div>
  );
}

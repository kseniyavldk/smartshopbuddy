import { ShoppingItem } from "./ShoppingItem";
import { useShoppingStore } from "../hooks/useShoppingStore";
import type { Item } from "../types/types";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  onScrollSave?: () => void;
}

export function ShoppingList({ onScrollSave }: Props) {
  const items = useShoppingStore((state) => state.items);
  const isLoading = useShoppingStore((state) => state.isLoading);
  const toggleBought = useShoppingStore((state) => state.toggleBought);
  const removeItem = useShoppingStore((state) => state.removeItem);

  return (
    <div onScroll={onScrollSave}>
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
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
          <AnimatePresence>
            {items.map((item: Item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <ShoppingItem
                  item={item}
                  onToggle={toggleBought}
                  onRemove={removeItem}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

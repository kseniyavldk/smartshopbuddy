import "./index.css";
import { useEffect } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";
import { useShoppingStore } from "./hooks/useShoppingStore";

export default function App() {
  const fetchCart = useShoppingStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCart?.();
  }, [fetchCart]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            🛒 Список покупок
          </h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Добавляйте и отмечайте товары
          </p>
        </header>

        <AddItemForm />

        <div className="mt-6">
          <ShoppingList />
        </div>
      </div>
    </div>
  );
}

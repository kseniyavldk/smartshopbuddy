import { useEffect } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";
import { useShoppingStore } from "./hooks/useShoppingStore";
import "./index.css";

export default function App() {
  const fetchCart = useShoppingStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCart?.();
  }, [fetchCart]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-[350px]">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            🛒 Список покупок
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
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

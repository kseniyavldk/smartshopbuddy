import "./index.css";
import { useEffect } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";
import { useShoppingStore } from "./hooks/useShoppingStore";

export default function App() {
  const fetchCart = useShoppingStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <main className="max-w-lg mx-auto p-4 bg-white shadow-lg rounded-xl min-h-screen flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-600">
          🛒 Список покупок
        </h1>
      </header>
      <div className="flex-1 flex flex-col gap-4">
        <AddItemForm />
        <div className="flex-1 overflow-y-auto">
          <ShoppingList />
        </div>
      </div>
    </main>
  );
}

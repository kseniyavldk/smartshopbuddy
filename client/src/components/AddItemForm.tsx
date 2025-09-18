import { useState } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

export function AddItemForm() {
  const [text, setText] = useState("");
  const addItem = useShoppingStore((state) => state.addItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length > 0 && value.length <= 50) {
      addItem(value);
      setText("");
      (e.target as HTMLFormElement).querySelector("input")?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Введите название товара..."
        maxLength={50}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        aria-label="Добавить товар"
        className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-600 active:scale-95 transition-transform"
      >
        ➕
      </button>
    </form>
  );
}

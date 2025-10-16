import { useState } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";
import toast from "react-hot-toast";

interface Props {
  onAdded?: () => void;
}

export function AddItemForm({ onAdded }: Props) {
  const [text, setText] = useState("");
  const addItem = useShoppingStore((state) => state.addItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      await addItem?.(text.trim());
      toast.success("Товар добавлен!");
      setText("");
      onAdded?.();
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
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-500 active:scale-95 transition-all shadow"
      >
        Добавить
      </button>
    </form>
  );
}

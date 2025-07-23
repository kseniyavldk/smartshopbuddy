import { useState } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

export function AddItemForm() {
  const [input, setInput] = useState("");
  const addItem = useShoppingStore((state) => state.addItem);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    addItem(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Добавить покупку"
        className="flex-grow px-3 py-2 border rounded"
      />
      <button type="submit" className="btn">
        Добавить
      </button>
    </form>
  );
}

import { useState, useEffect, useRef } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
}

export function JoinFamilyModal({ onClose }: Props) {
  const [inputId, setInputId] = useState("");
  const [error, setError] = useState("");
  const setMode = useShoppingStore((state) => state.setMode);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputId.trim()) {
      setError("Введите Chat ID семьи");
      return;
    }
    if (!/^\d+$/.test(inputId.trim())) {
      setError("Chat ID должен содержать только цифры");
      return;
    }

    setMode("family", inputId.trim());
    localStorage.setItem("shopping-mode", "family");
    localStorage.setItem("shopping-chatId", inputId.trim());
    toast.success("Вы вошли в семью!");
    setError("");
    onClose();
  };

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-lg"></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h1 className="text-xl font-bold text-blue-600 mb-4">
          🔑 Введите Chat ID
        </h1>

        <input
          type="text"
          ref={inputRef}
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder="Например: 505853908"
          className="border border-gray-300 rounded-xl px-3 py-2 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}

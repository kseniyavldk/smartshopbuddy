import { useState } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

interface Props {
  onClose: () => void;
}

export function JoinFamilyModal({ onClose }: Props) {
  const [inputId, setInputId] = useState("");
  const [error, setError] = useState("");
  const setMode = useShoppingStore((state) => state.setMode);

  const handleSubmit = () => {
    if (!inputId.trim()) {
      setError("Введите Chat ID семьи");
      return;
    }

    if (!/^\d+$/.test(inputId.trim())) {
      setError("Chat ID должен содержать только цифры");
      return;
    }

    setMode("family", inputId.trim());
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 
             bg-black bg-opacity-10 backdrop-blur-md"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative">
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

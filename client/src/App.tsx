import "./index.css";
import { useEffect, useState } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";
import { useShoppingStore } from "./hooks/useShoppingStore";
import { PurchaseHistory } from "./components/PurchaseHistory";

export default function App() {
  const { fetchCart, setMode, mode, chatId } = useShoppingStore();
  const [showPopup, setShowPopup] = useState(false);
  const [inputId, setInputId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlChatId = params.get("chatId");

    if (urlChatId) {
      setMode("family", urlChatId);
      localStorage.setItem("shopping-mode", "family");
      localStorage.setItem("shopping-chatId", urlChatId);
    } else {
      const savedMode = localStorage.getItem("shopping-mode") as
        | "local"
        | "family"
        | null;
      const savedChatId = localStorage.getItem("shopping-chatId");
      if (savedMode) {
        setMode(savedMode, savedChatId || undefined);
      } else {
        fetchCart?.();
      }
    }
  }, [fetchCart, setMode]);

  const handleJoinFamily = async () => {
    if (!inputId.trim()) {
      setError("Введите Chat ID семьи");
      return;
    }
    if (!/^\d+$/.test(inputId.trim())) {
      setError("Chat ID должен содержать только цифры");
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/cart/${inputId.trim()}`
      );

      if (!res.ok) throw new Error("Семья не найдена");

      const data = await res.json();
      if (data && Array.isArray(data.products)) {
        setMode("family", inputId.trim());
        localStorage.setItem("shopping-mode", "family");
        localStorage.setItem("shopping-chatId", inputId.trim());
        setShowPopup(false);
        setError("");
      } else {
        setError("Семья не найдена");
      }
    } catch {
      setError("Такой семьи не существует");
    }
  };

  const handleLeaveFamily = () => {
    setMode("local");
    localStorage.setItem("shopping-mode", "local");
    localStorage.removeItem("shopping-chatId");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            🛒 {mode === "local" ? "Личный список" : "Семейный список"}
          </h1>
        </header>

        <AddItemForm />

        <div className="mt-6">
          <ShoppingList />
        </div>
        <div className="mt-6">
          <PurchaseHistory />
        </div>

        {mode === "local" || (mode === "family" && !chatId) ? (
          <button
            onClick={() => setShowPopup(true)}
            className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            🔑 Войти в семью
          </button>
        ) : (
          <button
            onClick={handleLeaveFamily}
            className="w-full mt-4 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
          >
            🚪 Выйти из семьи
          </button>
        )}

        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-xl shadow-lg p-6 w-80 text-center">
              <h2 className="text-lg font-bold mb-3">Введите Chat ID</h2>
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: 505853908"
              />
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <div className="flex justify-between gap-2 mt-2">
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-1/2 bg-gray-300 rounded-xl px-3 py-2 hover:bg-gray-400"
                >
                  Отмена
                </button>
                <button
                  onClick={handleJoinFamily}
                  className="w-1/2 bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  Продолжить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

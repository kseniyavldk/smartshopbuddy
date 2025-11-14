import "./index.css";
import { useEffect, useState, useRef } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";
import { useShoppingStore } from "./hooks/useShoppingStore";
import { PurchaseHistory } from "./components/PurchaseHistory";
import { JoinFamilyModal } from "./components/JoinFamilyModal";
import toast, { Toaster } from "react-hot-toast";

export default function App() {
  const { fetchCart, setMode, mode, chatId } = useShoppingStore();
  const [showPopup, setShowPopup] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollPos = useRef(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  const handleLeaveFamily = () => {
    setMode("local");
    localStorage.setItem("shopping-mode", "local");
    localStorage.removeItem("shopping-chatId");
    toast.success("Вы покинули семью");
  };

  const saveScroll = () => {
    if (listRef.current) scrollPos.current = listRef.current.scrollTop;
  };
  const restoreScroll = () => {
    if (listRef.current) listRef.current.scrollTop = scrollPos.current;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        {!isOnline && (
          <p className="text-red-500 text-center mb-2">
            ⚠️ Нет соединения, изменения сохранятся локально
          </p>
        )}

        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            🛒 {mode === "local" ? "Личный список" : "Семейный список"}
          </h1>
        </header>

        <AddItemForm onAdded={restoreScroll} />

        <div className="mt-6" ref={listRef}>
          <div className="max-h-[15rem] overflow-y-auto">
            <ShoppingList onScrollSave={saveScroll} />
          </div>
        </div>

        <div className="mt-6" ref={listRef}>
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
            📦 История покупок
          </h2>
          <div className="max-h-[10rem] overflow-y-auto">
            <PurchaseHistory />
          </div>
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
          <JoinFamilyModal
            onClose={() => {
              setShowPopup(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

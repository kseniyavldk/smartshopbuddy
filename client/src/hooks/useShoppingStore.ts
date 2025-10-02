import { create } from "zustand";
import type { ShoppingState } from "../types/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const mapProducts = (products: any[]) =>
  products.map((p) => ({ id: String(p._id), text: p.text, bought: p.bought }));

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  mode: "local",
  chatId: null,

  setMode: (mode, chatId) => {
    set({ mode, chatId: chatId ?? null });

    if (mode === "local") {
      const saved = localStorage.getItem("shopping-items");
      if (saved) {
        set({ items: JSON.parse(saved) });
      } else {
        set({ items: [] });
      }
    } else if (chatId) {
      get().fetchCart();
    }
  },

  fetchCart: async () => {
    const { mode, chatId } = get();

    if (mode === "local") {
      const saved = localStorage.getItem("shopping-items");
      set({ items: saved ? JSON.parse(saved) : [] });
      return;
    }

    if (!chatId) return;

    try {
      const res = await fetch(`${API_URL}/cart/${chatId}`);
      if (res.status === 404) {
        set({ items: [] });
        alert("Такой семьи не существует");
        return;
      }
      if (!res.ok) throw new Error("Failed to load cart");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[fetchCart] error:", err);
    }
  },

  addItem: async (text: string) => {
    const { mode, chatId, items } = get();

    if (mode === "local") {
      const newItem = { id: Date.now().toString(), text, bought: false };
      const newItems = [...items, newItem];
      localStorage.setItem("shopping-items", JSON.stringify(newItems));
      set({ items: newItems });
      return;
    }

    if (!chatId) return;

    try {
      const res = await fetch(`${API_URL}/cart/${chatId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[addItem] error:", err);
    }
  },

  toggleBought: async (id: string) => {
    const { mode, chatId, items } = get();

    if (mode === "local") {
      const updated = items.map((item) =>
        item.id === id ? { ...item, bought: !item.bought } : item
      );
      localStorage.setItem("shopping-items", JSON.stringify(updated));
      set({ items: updated });
      return;
    }

    if (!chatId) return;

    try {
      const res = await fetch(`${API_URL}/cart/${chatId}/toggle/${id}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to toggle item");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[toggleBought] error:", err);
    }
  },

  removeItem: async (id: string) => {
    const { mode, chatId, items } = get();

    if (mode === "local") {
      const updated = items.filter((item) => item.id !== id);
      localStorage.setItem("shopping-items", JSON.stringify(updated));
      set({ items: updated });
      return;
    }

    if (!chatId) return;

    try {
      const res = await fetch(`${API_URL}/cart/${chatId}/remove/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[removeItem] error:", err);
    }
  },
}));

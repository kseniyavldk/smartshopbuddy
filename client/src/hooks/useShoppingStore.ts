import { create } from "zustand";
import type { ShoppingState, Item } from "../types/types";

const API_URL = "http://localhost:4000/api";
const CHAT_ID = "505853908";

export const useShoppingStore = create<ShoppingState>((set) => ({
  items: [],

  fetchCart: async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${CHAT_ID}`);
      if (!res.ok) throw new Error("Failed to load cart");
      const data = await res.json();
      set({
        items: data.products.map((p: any) => ({ ...p, id: String(p._id) })),
      });
    } catch (err) {
      console.error("fetchCart error:", err);
    }
  },

  addItem: async (text: string) => {
    try {
      const res = await fetch(`${API_URL}/cart/${CHAT_ID}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      set({
        items: data.products.map((p: any) => ({ ...p, id: String(p._id) })),
      });
    } catch (err) {
      console.error("addItem error:", err);
    }
  },

  toggleBought: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/cart/${CHAT_ID}/toggle/${id}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to toggle item");
      const data = await res.json();
      set({
        items: data.products.map((p: any) => ({ ...p, id: String(p._id) })),
      });
    } catch (err) {
      console.error("toggleBought error:", err);
    }
  },

  removeItem: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/cart/${CHAT_ID}/remove/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      const data = await res.json();
      set({
        items: data.products.map((p: any) => ({ ...p, id: String(p._id) })),
      });
    } catch (err) {
      console.error("removeItem error:", err);
    }
  },
}));

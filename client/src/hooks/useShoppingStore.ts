import { create } from "zustand";
import type { ShoppingState } from "../types/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const mapProducts = (products: any[]) =>
  products.map((p) => ({ id: String(p._id), text: p.text, bought: p.bought }));

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  archiveItems: [],
  mode: "local",
  chatId: null,
  isLoading: false,
  families: [],
  activeFamilyId: null,

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
      set({ isLoading: true });
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
    } finally {
      set({ isLoading: false });
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
      set({ isLoading: true });
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
    } finally {
      set({ isLoading: false });
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
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/cart/${chatId}/toggle/${id}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to toggle item");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[toggleBought] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchArchive: async () => {
    const { chatId, mode } = get();
    if (mode === "local" || !chatId) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/cart/${chatId}/archive`);

      if (res.status === 404) {
        set({ archiveItems: [] });
        return;
      }

      if (!res.ok) throw new Error("Failed to load archive");

      const data = await res.json();
      set({ archiveItems: mapProducts(data.archived) });
    } catch (err) {
      console.error("[fetchArchive] error:", err);
      set({ archiveItems: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  restoreFromArchive: async (id: string) => {
    const { chatId } = get();
    if (!chatId) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/cart/${chatId}/restore/${id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore item");
      const data = await res.json();
      set({
        items: mapProducts(data.products),
        archiveItems: mapProducts(data.archived),
      });
    } catch (err) {
      console.error("[restoreFromArchive] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (id: string) => {
    const { mode, chatId, items, archiveItems } = get();

    if (mode === "local") {
      let updatedItems = items.filter((item) => item.id !== id);
      let updatedArchive = archiveItems.filter((item) => item.id !== id);

      const removedFromItems = items.find((item) => item.id === id);
      if (removedFromItems) {
        updatedArchive = [...archiveItems, removedFromItems];
      }

      localStorage.setItem("shopping-items", JSON.stringify(updatedItems));
      localStorage.setItem("archive-items", JSON.stringify(updatedArchive));

      set({ items: updatedItems, archiveItems: updatedArchive });
      return;
    }

    if (!chatId) return;

    try {
      set({ isLoading: true });

      const inItems = items.find((item) => item.id === id);
      if (inItems) {
        const res = await fetch(`${API_URL}/cart/${chatId}/archive/${id}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Failed to archive item");
        const data = await res.json();
        set({
          items: mapProducts(data.products),
          archiveItems: mapProducts(data.archived),
        });
        return;
      }

      const inArchive = archiveItems.find((item) => item.id === id);
      if (inArchive) {
        const res = await fetch(`${API_URL}/cart/${chatId}/archive/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete item");
        const data = await res.json();
        set({
          items: mapProducts(data.products),
          archiveItems: mapProducts(data.archived),
        });
        return;
      }

      console.warn("Item not found in items or archive");
    } catch (err) {
      console.error("[removeItem] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },
  fetchFamilies: async (chatId: string) => {
    try {
      const res = await fetch(`${API_URL}/families/${chatId}`);
      if (!res.ok) throw new Error("Failed to fetch families");
      const data = await res.json();
      set({
        families: data.families || [],
        activeFamilyId: data.activeFamilyId || null,
      });
    } catch (err) {
      console.error("[fetchFamilies] error:", err);
    }
  },

  addFamily: async (chatId: string, familyId: string) => {
    try {
      const res = await fetch(`${API_URL}/families/${chatId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      if (!res.ok) throw new Error("Failed to add family");
      const data = await res.json();
      set({
        families: data.families,
        activeFamilyId: data.activeFamilyId,
      });
    } catch (err) {
      console.error("[addFamily] error:", err);
    }
  },

  switchFamily: async (chatId: string, familyId: string) => {
    try {
      const res = await fetch(
        `${API_URL}/families/${chatId}/switch/${familyId}`,
        {
          method: "PUT",
        }
      );
      if (!res.ok) throw new Error("Failed to switch family");
      const data = await res.json();
      set({ activeFamilyId: data.activeFamilyId });
      await get().fetchCart();
    } catch (err) {
      console.error("[switchFamily] error:", err);
    }
  },
}));

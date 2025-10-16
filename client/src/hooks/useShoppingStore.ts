import { create } from "zustand";
import type { ShoppingState } from "../types/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const mapProducts = (products: any[]) =>
  products.map((p) => ({
    id: String(p._id),
    text: p.text,
    bought: p.bought,
    updatedBy: p.updatedBy,
  }));

async function apiFetch(
  url: string,
  options: RequestInit = {},
  username?: string
) {
  const defaultHeaders = { "Content-Type": "application/json" };
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  if (["POST", "PUT", "DELETE"].includes(finalOptions.method || "")) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    finalOptions.body = JSON.stringify({ ...body, username });
  }

  const res = await fetch(url, finalOptions);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Request failed: ${res.status} ${errText}`);
  }
  return res.json();
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  archiveItems: [],
  mode: "local",
  chatId: null,
  isLoading: false,
  families: [],
  activeFamilyId: null,
  username: null,
  setUsername: (name) => set({ username: name }),

  setMode: (mode, chatId) => {
    set({ mode, chatId: chatId ?? null });

    if (mode === "local") {
      const saved = localStorage.getItem("shopping-items");
      set({ items: saved ? JSON.parse(saved) : [] });
    } else if (chatId) {
      get().fetchCart();
      get().fetchFamilies(chatId);
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
        console.warn("Cart not found for chatId:", chatId);
        return;
      }
      if (!res.ok) throw new Error("Failed to load cart");
      const data = await res.json();
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[fetchCart] error:", err);
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (text: string) => {
    const { mode, chatId, items, username } = get();

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
      const data = await apiFetch(
        `${API_URL}/cart/${chatId}/add`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        },
        username || "anonymous"
      );
      set({ items: mapProducts(data.products) });
    } catch (err) {
      console.error("[addItem] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleBought: async (id: string) => {
    const { mode, chatId, items, username } = get();

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
      const data = await apiFetch(
        `${API_URL}/cart/${chatId}/toggle/${id}`,
        { method: "PUT" },
        username || "anonymous"
      );
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
    const { chatId, username } = get();
    if (!chatId) return;

    try {
      set({ isLoading: true });
      const data = await apiFetch(
        `${API_URL}/cart/${chatId}/restore/${id}`,
        { method: "POST" },
        username || "anonymous"
      );
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
    const { mode, chatId, items, archiveItems, username } = get();

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
        const data = await apiFetch(
          `${API_URL}/cart/${chatId}/archive/${id}`,
          { method: "POST" },
          username || "anonymous"
        );
        set({
          items: mapProducts(data.products),
          archiveItems: mapProducts(data.archived),
        });
        return;
      }

      const inArchive = archiveItems.find((item) => item.id === id);
      if (inArchive) {
        const data = await apiFetch(
          `${API_URL}/cart/${chatId}/archive/${id}`,
          { method: "DELETE" },
          username || "anonymous"
        );
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

  fetchFamilies: async (chatId: string | number) => {
    if (!chatId) return;
    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/families/${chatId}`);
      if (res.status === 404) {
        console.warn("No families found for chatId:", chatId);
        set({ families: [], activeFamilyId: null });
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch families");
      const data = await res.json();

      set({
        families: (data.families || []).map(
          (f: string | { id: string; name?: string }) =>
            typeof f === "string"
              ? { id: String(f) }
              : { id: String(f.id), name: f.name }
        ),
        activeFamilyId: data.activeFamilyId
          ? String(data.activeFamilyId)
          : null,
      });
    } catch (err) {
      console.error("[fetchFamilies] error:", err);
      set({ families: [], activeFamilyId: null });
    } finally {
      set({ isLoading: false });
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
      const idStr = String(familyId);
      const res = await fetch(`${API_URL}/families/${chatId}/switch/${idStr}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to switch family");
      const data = await res.json();
      set({ activeFamilyId: String(data.activeFamilyId) });
      await get().fetchCart();
    } catch (err) {
      console.error("[switchFamily] error:", err);
    }
  },
}));

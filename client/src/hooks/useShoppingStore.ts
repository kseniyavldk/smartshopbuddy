import { create } from "zustand";

export interface Product {
  id: string;
  _id?: string;
  text: string;
  bought: boolean;
  updatedBy?: string;
}

export interface Family {
  id: string;
  name?: string;
}

export interface ShoppingState {
  items: Product[];
  archiveItems: Product[];
  mode: "local" | "server" | "family";
  chatId: string | null;
  username: string | null;
  activeFamilyId: string | null;
  families: Family[];
  isLoading: boolean;

  setUsername: (name: string) => void;
  setMode: (mode: "local" | "server" | "family", chatId?: string) => void;

  fetchCart: () => Promise<void>;
  addItem: (text: string) => Promise<void>;
  toggleBought: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  fetchArchive: () => Promise<void>;
  restoreFromArchive: (id: string) => Promise<void>;

  fetchFamilies: (chatId: string) => Promise<void>;
  addFamily: (chatId: string, familyId: string) => Promise<void>;
  switchFamily: (chatId: string, familyId: string) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const mapProducts = (products: any[]): Product[] =>
  products.map((p) => ({
    id: String(p._id || p.id || Date.now()),
    _id: p._id,
    text: p.text,
    bought: p.bought,
    updatedBy: p.updatedBy,
  }));

const mergeArchive = (current: Product[], incoming: Product[]) => {
  const newItems = incoming.filter(
    (item) => !current.some((i) => i.id === item.id)
  );
  return [...current, ...newItems];
};

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

const getActiveFamilyCart = (data: any) => {
  const cart = data.carts?.find((c: any) => c.familyId === data.activeFamilyId);
  return {
    products: cart?.products || data.products || [],
    archivedProducts: cart?.archivedProducts || data.archivedProducts || [],
  };
};

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  archiveItems: [],
  mode: "local",
  chatId: null,
  username: null,
  activeFamilyId: null,
  families: [],
  isLoading: false,

  setUsername: (name) => set({ username: name }),

  setMode: (mode, chatId) => {
    set({ mode, chatId: chatId ?? null });

    if (mode === "local") {
      const savedItems = localStorage.getItem("shopping-items");
      const savedArchive = localStorage.getItem("archive-items");
      set({
        items: savedItems ? JSON.parse(savedItems) : [],
        archiveItems: savedArchive ? JSON.parse(savedArchive) : [],
      });
    } else if (chatId) {
      get().fetchCart();
      get().fetchFamilies(chatId);
    }
  },

  fetchCart: async () => {
    const { mode, chatId } = get();
    if (mode === "local") {
      const savedItems = localStorage.getItem("shopping-items");
      set({ items: savedItems ? JSON.parse(savedItems) : [] });
      return;
    }
    if (!chatId) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/cart/${chatId}`);
      if (res.status === 404) {
        set({ items: [] });
        return;
      }
      if (!res.ok) throw new Error("Failed to load cart");

      const data = await res.json();
      const activeCart = getActiveFamilyCart(data);

      set((state) => ({
        items: mapProducts(activeCart.products),
        archiveItems: mergeArchive(
          state.archiveItems,
          mapProducts(activeCart.archivedProducts)
        ),
      }));
    } catch (err) {
      console.error("[fetchCart] error:", err);
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (text) => {
    const { mode, chatId, items, username } = get();

    if (mode === "local") {
      const newItem: Product = {
        id: Date.now().toString(),
        text,
        bought: false,
      };
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
        { method: "POST", body: JSON.stringify({ text }) },
        username || "anonymous"
      );
      const activeCart = getActiveFamilyCart(data);

      set((state) => ({
        items: mapProducts(activeCart.products),
        archiveItems: mergeArchive(
          state.archiveItems,
          mapProducts(activeCart.archivedProducts)
        ),
      }));
    } catch (err) {
      console.error("[addItem] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleBought: async (id) => {
    const { mode, chatId, username } = get();

    if (mode === "local") {
      const updated = get().items.map((item) =>
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
      const activeCart = getActiveFamilyCart(data);

      set((state) => ({
        items: mapProducts(activeCart.products),
        archiveItems: mergeArchive(
          state.archiveItems,
          mapProducts(activeCart.archivedProducts)
        ),
      }));
    } catch (err) {
      console.error("[toggleBought] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (id) => {
    const { mode, chatId, items, archiveItems, username } = get();

    if (mode === "local") {
      const itemInList = items.find((i) => i.id === id);
      const itemInArchive = archiveItems.find((i) => i.id === id);

      if (itemInList) {
        const updatedItems = items.filter((i) => i.id !== id);
        const updatedArchive = [...archiveItems, itemInList];
        set({ items: updatedItems, archiveItems: updatedArchive });
        localStorage.setItem("shopping-items", JSON.stringify(updatedItems));
        localStorage.setItem("archive-items", JSON.stringify(updatedArchive));
      } else if (itemInArchive) {
        const updatedArchive = archiveItems.filter((i) => i.id !== id);
        set({ archiveItems: updatedArchive });
        localStorage.setItem("archive-items", JSON.stringify(updatedArchive));
      }
      return;
    }

    if (!chatId) return;

    try {
      set({ isLoading: true });

      const itemInList = items.find((i) => i.id === id);
      const itemInArchive = archiveItems.find((i) => i.id === id);

      if (itemInList) {
        set({
          items: items.filter((i) => i.id !== id),
          archiveItems: [...archiveItems, itemInList],
        });
        await apiFetch(
          `${API_URL}/cart/${chatId}/archive/${id}`,
          { method: "POST" },
          username || "anonymous"
        );
      } else if (itemInArchive) {
        set({ archiveItems: archiveItems.filter((i) => i.id !== id) });
        await apiFetch(
          `${API_URL}/cart/${chatId}/archive/${id}`,
          { method: "DELETE" },
          username || "anonymous"
        );
      }
    } catch (err) {
      console.error("[removeItem] error:", err);
      get().fetchCart();
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
      if (res.status === 404) return;
      if (!res.ok) throw new Error("Failed to load archive");

      const data = await res.json();
      const activeCart = data.carts?.find(
        (c: any) => c.familyId === data.activeFamilyId
      );
      const archivedProducts =
        activeCart?.archivedProducts || data.archivedProducts || [];

      set((state) => ({
        archiveItems: mergeArchive(
          state.archiveItems,
          mapProducts(archivedProducts)
        ),
      }));
    } catch (err) {
      console.error("[fetchArchive] error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  restoreFromArchive: async (id) => {
    const { chatId, items, archiveItems, username } = get();
    if (!chatId) return;

    const item = archiveItems.find((i) => i.id === id);
    if (!item) return;

    set({
      items: [...items, item],
      archiveItems: archiveItems.filter((i) => i.id !== id),
    });

    try {
      await apiFetch(
        `${API_URL}/cart/${chatId}/restore/${id}`,
        { method: "POST" },
        username || "anonymous"
      );
    } catch (err) {
      console.error("[restoreFromArchive] error:", err);
      set({ items, archiveItems });
    }
  },

  fetchFamilies: async (chatId) => {
    if (!chatId) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/families/${chatId}`);
      if (res.status === 404) {
        set({ families: [], activeFamilyId: null });
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch families");

      const data = await res.json();
      set({
        families: (data.families || []).map((f: any) =>
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

  addFamily: async (chatId, familyId) => {
    try {
      const res = await fetch(`${API_URL}/families/${chatId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      if (!res.ok) throw new Error("Failed to add family");
      const data = await res.json();
      set({ families: data.families, activeFamilyId: data.activeFamilyId });
    } catch (err) {
      console.error("[addFamily] error:", err);
    }
  },

  switchFamily: async (chatId, familyId) => {
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

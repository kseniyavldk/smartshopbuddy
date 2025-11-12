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

interface IServerCart {
  familyId?: string;
  products?: any[];
  archivedProducts?: any[];
}

interface IFetchFamiliesResponse {
  carts?: IServerCart[];
  activeFamilyId?: string;
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
    headers: { ...defaultHeaders, ...(options.headers || {}) },
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
    const savedChatId = chatId ?? localStorage.getItem("chatId") ?? null;
    set({ mode, chatId: savedChatId });
    if (savedChatId) localStorage.setItem("chatId", savedChatId);

    if (mode === "local") {
      const savedItems = localStorage.getItem("shopping-items");
      const savedArchive = localStorage.getItem("archive-items");
      set({
        items: savedItems ? JSON.parse(savedItems) : [],
        archiveItems: savedArchive ? JSON.parse(savedArchive) : [],
        activeFamilyId: localStorage.getItem("activeFamilyId"),
      });
    } else if (savedChatId) {
      get().fetchCart();
      get().fetchFamilies(savedChatId);
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
      const item = items.find((i) => i.id === id);
      if (item) {
        set({
          items: items.filter((i) => i.id !== id),
          archiveItems: [...archiveItems, item],
        });
        localStorage.setItem(
          "shopping-items",
          JSON.stringify(items.filter((i) => i.id !== id))
        );
        localStorage.setItem(
          "archive-items",
          JSON.stringify([...archiveItems, item])
        );
        return;
      }
      const archiveItem = archiveItems.find((i) => i.id === id);
      if (archiveItem) {
        set({ archiveItems: archiveItems.filter((i) => i.id !== id) });
        localStorage.setItem(
          "archive-items",
          JSON.stringify(archiveItems.filter((i) => i.id !== id))
        );
        return;
      }
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
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  restoreFromArchive: async (id) => {
    const { mode, chatId, items, archiveItems, username } = get();
    const item = archiveItems.find((i) => i.id === id);
    if (!item) return;

    const newItems = [...items, item];
    const newArchive = archiveItems.filter((i) => i.id !== id);
    set({ items: newItems, archiveItems: newArchive });

    if (mode === "local") {
      localStorage.setItem("shopping-items", JSON.stringify(newItems));
      localStorage.setItem("archive-items", JSON.stringify(newArchive));
      return;
    }
    if (!chatId) return;

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

  fetchFamilies: async (chatId) => {
    if (!chatId) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/cart/${chatId}`);
      if (res.status === 404) {
        set({ families: [], activeFamilyId: null });
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch families");

      const data: IFetchFamiliesResponse = await res.json();
      const carts: IServerCart[] = data.carts ?? [];

      const families: Family[] = carts
        .filter((c) => c.familyId)
        .map((c) => ({ id: c.familyId!, name: c.familyId! }));

      const activeFamilyId = data.activeFamilyId || (families[0]?.id ?? null);

      set({ families, activeFamilyId });
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
      const res = await fetch(
        `${API_URL}/families/${chatId}/switch/${familyId}`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error("Failed to switch family");

      const data = await res.json();
      set({ activeFamilyId: String(data.activeFamilyId) });
      await get().fetchCart();
    } catch (err) {
      console.error("[switchFamily] error:", err);
    }
  },
}));

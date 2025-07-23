import { create } from "zustand";
import type { ShoppingState } from "../types/types";

export const useShoppingStore = create<ShoppingState>((set) => ({
  items: [],
  addItem: (text: string) =>
    set((state: ShoppingState) => ({
      items: [...state.items, { id: Date.now(), text, bought: false }],
    })),
  toggleBought: (id: string | number) =>
    set((state: ShoppingState) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, bought: !item.bought } : item
      ),
    })),
  removeItem: (id: string | number) =>
    set((state: ShoppingState) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));

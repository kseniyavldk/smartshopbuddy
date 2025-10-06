export interface Item {
  id: string;
  text: string;
  bought: boolean;
}

export interface ShoppingState {
  items: Item[];
  mode: "local" | "family";
  chatId: string | null;
  archiveItems: Item[];
  isLoading: boolean;

  setMode: (mode: "local" | "family", chatId?: string) => void;
  fetchCart: () => void | Promise<void>;
  addItem: (text: string) => void | Promise<void>;
  toggleBought: (id: string) => void | Promise<void>;
  removeItem: (id: string) => void | Promise<void>;
  fetchArchive: () => Promise<void>;
  restoreFromArchive: (id: string) => Promise<void>;
}

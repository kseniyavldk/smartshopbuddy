export interface Item {
  id: string | number;
  text: string;
  bought: boolean;
}

export interface ShoppingState {
  items: Item[];
  fetchCart: () => Promise<void>;
  addItem: (text: string) => void;
  toggleBought: (id: string | number) => void;
  removeItem: (id: string | number) => void;
}

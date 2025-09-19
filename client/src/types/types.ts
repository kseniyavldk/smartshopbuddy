export interface Item {
  id: string;
  text: string;
  bought: boolean;
}

export interface ShoppingState {
  items: Item[];
  fetchCart: () => void;
  addItem: (text: string) => void;
  toggleBought: (id: string) => void;
  removeItem: (id: string) => void;
}

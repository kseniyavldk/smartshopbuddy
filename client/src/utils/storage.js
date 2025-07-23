export function loadItems() {
  const data = localStorage.getItem("shopping-items");
  return data ? JSON.parse(data) : [];
}

export function saveItems(items) {
  localStorage.setItem("shopping-items", JSON.stringify(items));
}

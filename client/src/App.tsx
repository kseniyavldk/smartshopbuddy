import "./index.css";
import { AddItemForm } from "./components/AddItemForm";
import { ShoppingList } from "./components/ShoppingList";

function App() {
  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-3xl mb-4 font-bold text-center">Список покупок</h1>
      <AddItemForm />
      <ShoppingList />
    </main>
  );
}

export default App;

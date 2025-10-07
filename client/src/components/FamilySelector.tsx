import { useEffect } from "react";
import { useShoppingStore } from "../hooks/useShoppingStore";

export function FamilySelector() {
  const { families, activeFamilyId, fetchFamilies, switchFamily, chatId } =
    useShoppingStore();

  useEffect(() => {
    if (chatId) fetchFamilies(chatId);
  }, [chatId, fetchFamilies]);

  if (!chatId) return null;

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">👨‍👩‍👧‍👦 Ваши семьи</h3>
      <div className="flex flex-wrap gap-2">
        {families.map((family) => (
          <button
            key={family.id}
            onClick={() => switchFamily(chatId, family.id)}
            className={`px-3 py-1 rounded-xl border ${
              family.id === activeFamilyId
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {family.name || family.id}
          </button>
        ))}
      </div>
    </div>
  );
}

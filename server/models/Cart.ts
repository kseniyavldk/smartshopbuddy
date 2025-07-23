import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  products: [{ type: String }],
});

export const Cart = mongoose.model("Cart", cartSchema);

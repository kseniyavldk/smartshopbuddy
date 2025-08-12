import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  familyId: { type: String },
  products: [
    {
      text: { type: String, required: true },
      bought: { type: Boolean, default: false },
    },
  ],
});

export const Cart = mongoose.model("Cart", cartSchema);

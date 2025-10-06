import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  text: string;
  bought: boolean;
}

export interface ICart extends Document {
  chatId: number;
  familyId: string;
  products: Types.DocumentArray<IProduct>;
  archivedProducts: Types.DocumentArray<IProduct>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  text: { type: String, required: true },
  bought: { type: Boolean, default: false },
});

const cartSchema = new Schema<ICart>(
  {
    chatId: { type: Number, required: true },
    familyId: { type: String, required: true },
    products: [productSchema],
    archivedProducts: [productSchema],
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", cartSchema);

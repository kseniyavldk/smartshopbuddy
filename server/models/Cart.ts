import { Schema, model, Document } from "mongoose";

export interface IProduct {
  text: string;
  bought: boolean;
}

export interface ICart extends Document {
  chatId: number;
  familyId: string;
  products: IProduct[];
  createdAt: Date;
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
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", cartSchema);

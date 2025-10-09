import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  text: string;
  bought: boolean;
}

export interface ICart extends Document {
  chatId: number;
  familyId?: string;
  familyIds: string[];
  activeFamilyId?: string;
  products: Types.DocumentArray<IProduct>;
  archivedProducts: Types.DocumentArray<IProduct>;
  createdAt: Date;
  updatedAt: Date;
  familyRoles: Map<string, string>;
}

const productSchema = new Schema<IProduct>({
  text: { type: String, required: true },
  bought: { type: Boolean, default: false },
});

const cartSchema = new Schema<ICart>(
  {
    chatId: { type: Number, required: true },
    familyId: { type: String },
    familyIds: { type: [String], default: [] },
    activeFamilyId: { type: String },
    products: [productSchema],
    archivedProducts: [productSchema],
    familyRoles: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", cartSchema);

import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  text: string;
  bought: boolean;
  updatedBy?: string;
}

export interface IFamilyCart extends Document {
  familyId: string;
  products: Types.DocumentArray<IProduct>;
  archivedProducts: Types.DocumentArray<IProduct>;
}

export interface ICart extends Document {
  chatId: number;
  familyIds: string[];
  activeFamilyId?: string;
  carts: Types.DocumentArray<IFamilyCart>;
  createdAt: Date;
  updatedAt: Date;
  familyRoles: Map<string, string>;
}

const productSchema = new Schema<IProduct>({
  text: { type: String, required: true },
  bought: { type: Boolean, default: false },
  updatedBy: { type: String },
});

const familyCartSchema = new Schema<IFamilyCart>({
  familyId: { type: String, required: true },
  products: [productSchema],
  archivedProducts: [productSchema],
});

const cartSchema = new Schema<ICart>(
  {
    chatId: { type: Number, required: true },
    familyIds: { type: [String], default: [] },
    activeFamilyId: { type: String },
    carts: { type: [familyCartSchema], default: [] },
    familyRoles: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", cartSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IProduct {
   _id?: mongoose.Types.ObjectId;
  text: string;
  bought: boolean;
  updatedBy?: string;
  updatedAt?: Date;
  archivedAt?: Date;
}

export interface ICart extends Document {
  chatId: string;
  familyId?: string;
  products: IProduct[];
  archivedProducts: IProduct[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  text: { type: String, required: true },
  bought: { type: Boolean, default: false },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
  archivedAt: { type: Date },
});

const CartSchema = new Schema<ICart>(
  {
    chatId: { type: String, required: true, index: true },
    familyId: { type: String },
    products: { type: [ProductSchema], default: [] },
    archivedProducts: { type: [ProductSchema], default: [] },
  },
  { timestamps: true }
);

const Cart = mongoose.model<ICart>("Cart", CartSchema);
export default Cart;

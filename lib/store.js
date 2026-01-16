import { configureStore, createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: [],
    total: 0,
    totalQuantity: 0,
  },
  reducers: {
    addItem: (state, action) => {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      state.totalQuantity += 1;
      state.total += action.payload.price;
    },
    removeItem: (state, action) => {
      const itemId = action.payload;
      const existingItem = state.items.find((item) => item.id === itemId);
      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.total -= existingItem.price * existingItem.quantity;
        state.items = state.items.filter((item) => item.id !== itemId);
      }
    },
    decreaseQuantity: (state, action) => {
      const itemId = action.payload;
      const existingItem = state.items.find((item) => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        existingItem.quantity -= 1;
        state.totalQuantity -= 1;
        state.total -= existingItem.price;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.totalQuantity = 0;
    },
  },
});

export const { addItem, removeItem, decreaseQuantity, clearCart } =
  cartSlice.actions;
export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
  },
});

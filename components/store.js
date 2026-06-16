"use client";
import { createContext, useContext } from "react";

/* Shared app store context. Kept in its own module so every view can import
   `useStore` without creating an import cycle with App.jsx. */
export const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

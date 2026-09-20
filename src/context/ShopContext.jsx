import React, { createContext, useContext, useEffect, useState } from "react";
import api, { API_ORIGIN } from "../api/axios.js";
import { SHOP_DEFAULTS } from "../config/shop.js";

const ShopContext = createContext();

const withAbsoluteLogo = (shop) => ({
  ...shop,
  logoUrl: shop.logoUrl?.startsWith("http") ? shop.logoUrl : `${API_ORIGIN}${shop.logoUrl || ""}`,
});

export const ShopProvider = ({ children }) => {
  const [shop, setShop] = useState(() => withAbsoluteLogo(SHOP_DEFAULTS));

  // Backend se asli naam / GST / output settings (fail ho jaye to defaults chalte rahenge)
  useEffect(() => {
    let cancelled = false;
    api
      .get("/shop")
      .then(({ data }) => {
        if (!cancelled) setShop((prev) => withAbsoluteLogo({ ...prev, ...data }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = `${shop.name} Manager`;
  }, [shop.name]);

  return <ShopContext.Provider value={{ shop }}>{children}</ShopContext.Provider>;
};

export const useShop = () => useContext(ShopContext);

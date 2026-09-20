import React, { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext.jsx";

// Shop ka logo dikhata hai. Logo file nahi mili to emoji dikhata hai.
const ShopLogo = ({ size = 40, className = "" }) => {
  const { shop } = useShop();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [shop.logoUrl]);

  if (failed || !shop.logoUrl) {
    return (
      <span className={className} style={{ fontSize: size * 0.75, lineHeight: 1 }}>
        {shop.emoji}
      </span>
    );
  }
  return (
    <img
      src={shop.logoUrl}
      alt={shop.name}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
    />
  );
};

export default ShopLogo;

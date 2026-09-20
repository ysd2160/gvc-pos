import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import ShopLogo from "./ShopLogo.jsx";

const mainItems = [
  { to: "/dashboard", label: "Home", icon: "🏠" },
  { to: "/billing", label: "New Bill", icon: "🧾", primary: true },
  { to: "/bills", label: "Bills", icon: "📋" },
];

const adminItems = [
  { to: "/products", label: "Products", icon: "📦" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/staff", label: "Staff", icon: "👥" },
];

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { shop } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const desktopItems = isAdmin ? [...mainItems, ...adminItems] : mainItems;

  // Page badalte hi "More" sheet band
  useEffect(() => setMoreOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const moreActive = adminItems.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:sticky md:top-0 md:h-screen bg-white border-r border-gray-200 p-4">
        <div className="mb-6 px-2 flex items-center gap-3">
          <ShopLogo size={44} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-primary-700 leading-tight">{shop.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {user?.name} ({user?.role})
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {desktopItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="btn-secondary mt-4 w-full">
          Logout
        </button>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header
        className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-3 pb-2 flex items-center justify-between gap-2"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShopLogo size={32} />
          <h1 className="text-base font-bold text-primary-700 truncate">{shop.name}</h1>
        </div>
      </header>

      {/* ---------- Main content ---------- */}
      <main className="flex-1 p-4 pb-28 md:pb-6 md:p-6 max-w-5xl w-full mx-auto min-w-0">
        {children}
      </main>

      {/* ---------- Mobile bottom nav: sirf 4 buttons, kuch bhi cut nahi hota ---------- */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 grid grid-cols-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-16 text-xs ${
                isActive ? "text-primary-700 font-semibold" : "text-gray-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center text-xl w-11 h-8 rounded-full transition ${
                    item.primary ? "bg-primary-600 text-white" : isActive ? "bg-primary-50" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="mt-0.5">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center h-16 text-xs ${
            moreActive || moreOpen ? "text-primary-700 font-semibold" : "text-gray-500"
          }`}
        >
          <span className={`flex items-center justify-center text-xl w-11 h-8 rounded-full ${moreActive ? "bg-primary-50" : ""}`}>
            ⋯
          </span>
          <span className="mt-0.5">More</span>
        </button>
      </nav>

      {/* ---------- "More" bottom sheet ---------- */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 space-y-3"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            <p className="text-sm text-gray-500">
              {user?.name} ({user?.role})
            </p>
            {isAdmin && (
              <div className="grid grid-cols-3 gap-2">
                {adminItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gray-50 text-gray-700 text-sm font-medium active:scale-95 transition"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
            <button onClick={handleLogout} className="btn-secondary w-full">
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

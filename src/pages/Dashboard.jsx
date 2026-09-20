import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { toLocalDateStr } from "../utils/date.js";

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { shop } = useShop();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = toLocalDateStr(new Date());

    const fetchData = async () => {
      try {
        const productsRes = await api.get("/products");
        setAllProducts(productsRes.data);

        if (isAdmin) {
          const [salesRes, stockRes] = await Promise.all([
            api.get(`/reports/sales-summary?from=${today}&to=${today}`),
            api.get("/products?lowStock=true"),
          ]);
          setSummary(salesRes.data);
          setLowStock(stockRes.data);
        } else {
          const billsRes = await api.get(`/bills`);
          const todayBills = billsRes.data.filter(
            (b) => toLocalDateStr(new Date(b.createdAt)) === today
          );
          setSummary({
            totalSales: todayBills.reduce((s, b) => s + b.grandTotal, 0),
            totalBills: todayBills.length,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Hi, {user?.name} 👋</h2>
        <p className="text-gray-500 text-sm">Here's today's overview</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs text-gray-500">Today's Sales</p>
            <p className="text-2xl font-bold text-primary-700 mt-1">
              ₹{summary?.totalSales?.toFixed(0) || 0}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">Bills Today</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary?.totalBills || 0}</p>
          </div>
          {isAdmin && (
            <>
              {shop.gstEnabled && (
                <div className="card">
                  <p className="text-xs text-gray-500">GST Collected</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    ₹{summary?.totalGstCollected?.toFixed(0) || 0}
                  </p>
                </div>
              )}
              <div className="card">
                <p className="text-xs text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{lowStock.length}</p>
              </div>
            </>
          )}
        </div>
      )}

      <Link to="/billing" className="btn-primary w-full block text-center text-lg">
        + Create New Bill
      </Link>

      {/* All products - quick view on home page */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-700">All Products ({allProducts.length})</p>
          {isAdmin && <Link to="/products" className="text-sm text-primary-600 font-medium">Manage →</Link>}
        </div>
        {allProducts.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center card">No products added yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allProducts.map((p) => (
              <div key={p._id} className="card py-3">
                <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">₹{p.sellingPrice}/{p.unit}</p>
                {p.trackStock !== false && (
                  <p className={`text-xs mt-1 font-medium ${p.quantity <= p.lowStockThreshold ? "text-red-500" : "text-green-600"}`}>
                    Stock: {p.quantity}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && lowStock.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <p className="font-semibold text-red-700 mb-2">⚠️ Low Stock Alert</p>
          <ul className="space-y-1 text-sm text-red-600">
            {lowStock.slice(0, 5).map((p) => (
              <li key={p._id}>
                {p.name} — only {p.quantity} {p.unit} left
              </li>
            ))}
          </ul>
          <Link to="/products" className="text-sm text-red-700 font-medium underline mt-2 inline-block">
            Manage Stock →
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

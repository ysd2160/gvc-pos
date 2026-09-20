import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useShop } from "../context/ShopContext.jsx";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
// 230 -> "230", 230.5 -> "230.50"  (input boxes ke liye)
const fmt = (n) => (Number.isInteger(round2(n)) ? String(round2(n)) : round2(n).toFixed(2));
const amtStr = (n) => (n > 0 ? fmt(n) : "");
// Display: ₹230 / ₹230.50
const money = (n) => `₹${fmt(n)}`;

const newRow = (mode = "Cash") => ({ mode, amount: "", received: "", touched: false });

// Cash ke quick buttons: 230 -> 250, 300, 500, 1000
const cashSuggestions = (amount) => {
  const a = Number(amount) || 0;
  if (a <= 0) return [];
  const out = new Set();
  [50, 100, 500, 1000].forEach((n) => out.add((Math.floor(a / n) + 1) * n));
  return [...out].sort((x, y) => x - y).slice(0, 4);
};

const Billing = () => {
  const { shop } = useShop();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]); // {productId, name, price, unit, gstPercent, quantity, trackStock, availableStock}
  const [view, setView] = useState("menu"); // mobile: "menu" | "cart" (desktop par dono saath dikhte hain)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [orderType, setOrderType] = useState("Dine-in");
  const [tableNo, setTableNo] = useState("");
  const [discount, setDiscount] = useState("");
  const [payments, setPayments] = useState([newRow("Cash")]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        setProducts(data);
      } catch (err) {
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ---------------------------------------------------------------- cart
  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
      return;
    }
    const item = cart.find((c) => c.productId === productId);
    if (item && item.trackStock && qty > item.availableStock) {
      toast.error(`Only ${item.availableStock} ${item.unit} available`);
      return;
    }
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)));
  };

  const addToCart = (product) => {
    const tracked = product.trackStock !== false;
    if (tracked && product.quantity <= 0) {
      toast.error("Out of stock!");
      return;
    }
    const existing = cart.find((c) => c.productId === product._id);
    if (existing) {
      updateQty(product._id, existing.quantity + 1);
      return;
    }
    setCart([
      ...cart,
      {
        productId: product._id,
        name: product.name,
        price: product.sellingPrice,
        unit: product.unit,
        gstPercent: shop.gstEnabled ? product.gstPercent || 0 : 0,
        quantity: 1,
        trackStock: tracked,
        availableStock: product.quantity,
      },
    ]);
  };

  // ------------------------------------------------------------- totals
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const subtotal = round2(cart.reduce((sum, c) => sum + c.price * c.quantity, 0));
  const totalGst = shop.gstEnabled
    ? round2(cart.reduce((sum, c) => sum + (c.price * c.quantity * c.gstPercent) / 100, 0))
    : 0;
  const discountAmount = Math.max(0, Number(discount) || 0);
  const grandTotal = round2(Math.max(0, subtotal + totalGst - discountAmount));

  // ---------------------------------------------------------- payments
  const otherSum = (rows, idx) => rows.reduce((s, r, i) => (i === idx ? s : s + (Number(r.amount) || 0)), 0);

  // Ek hi payment row hai aur cashier ne haath nahi lagaya -> amount hamesha bill total ke barabar
  useEffect(() => {
    setPayments((prev) => {
      if (prev.length !== 1 || prev[0].touched) return prev;
      const amt = amtStr(grandTotal);
      return prev[0].amount === amt ? prev : [{ ...prev[0], amount: amt }];
    });
  }, [grandTotal]);

  // UPI / Card / Cash chunte hi baaki bachi amount khud bhar jaati hai
  const changeMode = (idx, mode) => {
    setPayments((prev) =>
      prev.map((r, i) =>
        i !== idx
          ? r
          : { ...r, mode, received: "", touched: false, amount: amtStr(round2(Math.max(0, grandTotal - otherSum(prev, idx)))) }
      )
    );
  };

  const setAmount = (idx, value) => {
    setPayments((prev) => {
      let next = prev.map((r, i) => (i === idx ? { ...r, amount: value, touched: true } : r));
      // 2 rows (split) mein doosri row automatic baaki amount le leti hai
      if (next.length === 2) {
        const o = 1 - idx;
        if (!next[o].touched) {
          next = next.map((r, i) =>
            i === o ? { ...r, amount: amtStr(round2(Math.max(0, grandTotal - (Number(value) || 0)))) } : r
          );
        }
      }
      return next;
    });
  };

  const setReceived = (idx, value) =>
    setPayments((prev) => prev.map((r, i) => (i === idx ? { ...r, received: value } : r)));

  const addRow = () =>
    setPayments((prev) => [...prev, newRow(prev.some((r) => r.mode === "Cash") ? "UPI" : "Cash")]);

  const removeRow = (idx) =>
    setPayments((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 1 ? [{ ...next[0], touched: false, amount: amtStr(grandTotal) }] : next;
    });

  const totalPaid = round2(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const balanceDue = Math.max(0, round2(grandTotal - totalPaid));
  const overpaid = totalPaid > grandTotal + 0.01;
  const cashShort = payments.some(
    (p) => p.mode === "Cash" && Number(p.received) > 0 && Number(p.received) < (Number(p.amount) || 0)
  );
  // Cashier ko kitna wapas dena hai (saari cash rows ka)
  const changeTotal = round2(
    payments.reduce((s, p) => {
      const a = Number(p.amount) || 0;
      const r = Number(p.received) || 0;
      return p.mode === "Cash" && r > a ? s + (r - a) : s;
    }, 0)
  );

  // ------------------------------------------------------------- submit
  const handleCreateBill = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (cashShort) {
      toast.error("Customer ne cash bill se kam diya hai");
      setView("cart");
      return;
    }
    if (overpaid) {
      toast.error("Payment amount bill total se zyada hai");
      setView("cart");
      return;
    }
    const validPayments = payments
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({
        mode: p.mode,
        amount: Number(p.amount),
        ...(p.mode === "Cash" && Number(p.received) > 0 ? { received: Number(p.received) } : {}),
      }));

    if (validPayments.length === 0 && grandTotal > 0) {
      if (!window.confirm("Koi payment nahi daala - poora bill baaki (udhaar) mark hoga. Continue?")) return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/bills", {
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        discount: discountAmount,
        payments: validPayments,
        orderType: shop.orderType ? orderType : "",
        tableNo: shop.orderType && orderType === "Dine-in" ? tableNo : "",
      });
      toast.success(`Bill ${data.billNumber} created!`);
      navigate(`/bills/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  };

  const generateLabel = submitting ? "Creating Bill..." : `Generate Bill — ${money(grandTotal)}`;

  // ================================================================ UI
  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <h2 className="text-xl font-bold text-gray-800">New Bill</h2>

      {/* Mobile: Menu / Cart tabs (desktop par dono side-by-side) */}
      <div className="md:hidden grid grid-cols-2 bg-gray-100 rounded-xl p-1 text-sm font-medium">
        {[
          ["menu", "🍽️ Menu"],
          ["cart", "🛒 Cart"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`min-h-[40px] rounded-lg transition ${view === key ? "bg-white shadow text-primary-700" : "text-gray-500"}`}
          >
            {label}
            {key === "cart" && cartCount > 0 && (
              <span className="ml-1.5 bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">{cartCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-5 md:gap-6 md:items-start">
        {/* ============================ MENU ============================ */}
        <section className={`${view === "menu" ? "block" : "hidden"} md:block md:col-span-3 space-y-3`}>
          <input
            className="input-field"
            placeholder="🔍 Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {categories.length > 2 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`chip ${selectedCategory === c ? "chip-active" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredProducts.map((p) => {
              const tracked = p.trackStock !== false;
              const cartItem = cart.find((c) => c.productId === p._id);

              if (cartItem) {
                return (
                  <div
                    key={p._id}
                    className="flex flex-col p-3 rounded-2xl border-2 border-primary-400 bg-primary-50 text-left"
                  >
                    <p className="font-semibold text-gray-800 text-sm line-clamp-2">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {money(p.sellingPrice)}/{p.unit}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <button
                        onClick={() => updateQty(p._id, cartItem.quantity - 1)}
                        className="w-10 h-10 bg-white border border-primary-300 rounded-xl text-lg font-bold text-primary-700 active:scale-90 transition"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="font-bold text-primary-700">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQty(p._id, cartItem.quantity + 1)}
                        className="w-10 h-10 bg-primary-600 rounded-xl text-lg font-bold text-white active:scale-90 transition"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              }

              const outOfStock = tracked && p.quantity <= 0;
              return (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  disabled={outOfStock}
                  className="flex flex-col items-start justify-between min-h-[92px] p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-left disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                >
                  <p className="font-semibold text-gray-800 text-sm line-clamp-2">{p.name}</p>
                  <div>
                    <p className="text-sm font-bold text-primary-700 mt-1">
                      {money(p.sellingPrice)}
                      <span className="text-xs font-normal text-gray-400">/{p.unit}</span>
                    </p>
                    {tracked && (
                      <p className={`text-xs mt-0.5 font-medium ${p.quantity <= p.lowStockThreshold ? "text-red-500" : "text-green-600"}`}>
                        Stock: {p.quantity}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="text-sm text-gray-400 py-6 col-span-full text-center">No products found</p>
            )}
          </div>
        </section>

        {/* ============================ CART ============================ */}
        <section className={`${view === "cart" ? "block" : "hidden"} md:block md:col-span-2 md:sticky md:top-4 space-y-3`}>
          {cart.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-gray-500 text-sm">Cart khaali hai</p>
              <button onClick={() => setView("menu")} className="md:hidden mt-4 btn-secondary text-sm px-4 py-2">
                ← Menu par jao
              </button>
            </div>
          ) : (
            <>
              {/* Order type (sirf cafe) */}
              {shop.orderType && (
                <div className="card space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {["Dine-in", "Takeaway"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setOrderType(t)}
                        className={`min-h-[44px] rounded-xl text-sm font-medium transition ${
                          orderType === t ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {t === "Dine-in" ? "🍽️ Dine-in" : "🥡 Takeaway"}
                      </button>
                    ))}
                  </div>
                  {orderType === "Dine-in" && (
                    <input
                      className="input-field"
                      placeholder="Table no. (optional)"
                      value={tableNo}
                      onChange={(e) => setTableNo(e.target.value)}
                      maxLength={10}
                    />
                  )}
                </div>
              )}

              {/* Items */}
              <div className="card space-y-3">
                <p className="font-semibold text-gray-700">Items ({cart.length})</p>
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {money(item.price)} × {item.quantity} = {money(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-9 h-9 bg-gray-100 rounded-lg font-bold" aria-label="Decrease">
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-9 h-9 bg-gray-100 rounded-lg font-bold" aria-label="Increase">
                        +
                      </button>
                      <button onClick={() => updateQty(item.productId, 0)} className="w-9 h-9 text-red-500" aria-label="Remove">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="card space-y-2">
                {(shop.gstEnabled || discountAmount > 0) && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                )}
                {shop.gstEnabled && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>GST</span>
                    <span>{money(totalGst)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-right"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="flex justify-between font-bold text-xl text-gray-800 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{money(grandTotal)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="card space-y-3">
                <p className="font-semibold text-gray-700">Payment</p>

                {payments.map((p, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {["Cash", "UPI", "Card"].map((m) => (
                        <button
                          key={m}
                          onClick={() => changeMode(idx, m)}
                          className={`min-h-[44px] rounded-xl text-sm font-medium transition ${
                            p.mode === m ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {m === "Cash" ? "💵 Cash" : m === "UPI" ? "📱 UPI" : "💳 Card"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">{p.mode} amount (₹)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="input-field"
                          placeholder="Amount"
                          value={p.amount}
                          onChange={(e) => setAmount(idx, e.target.value)}
                        />
                      </div>
                      {payments.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="text-red-500 w-10 h-10 mt-5" aria-label="Remove payment">
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Cash: customer ne kitna diya -> kitna wapas karna hai */}
                    {p.mode === "Cash" && Number(p.amount) > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <label className="text-xs text-gray-500">Customer ne diye (Cash received)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="input-field bg-white"
                          placeholder={`Exact ${money(p.amount)}`}
                          value={p.received}
                          onChange={(e) => setReceived(idx, e.target.value)}
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setReceived(idx, "")}
                            className={`chip ${p.received === "" ? "chip-active" : ""}`}
                          >
                            Exact
                          </button>
                          {cashSuggestions(p.amount).map((v) => (
                            <button
                              key={v}
                              onClick={() => setReceived(idx, String(v))}
                              className={`chip ${Number(p.received) === v ? "chip-active" : ""}`}
                            >
                              ₹{v}
                            </button>
                          ))}
                        </div>

                        {Number(p.received) > Number(p.amount) && (
                          <div className="bg-green-100 text-green-800 rounded-xl px-3 py-2 flex justify-between items-center">
                            <span className="text-sm font-medium">Wapas do (Return)</span>
                            <span className="text-2xl font-bold">{money(Number(p.received) - Number(p.amount))}</span>
                          </div>
                        )}
                        {Number(p.received) > 0 && Number(p.received) < Number(p.amount) && (
                          <div className="bg-red-100 text-red-700 rounded-xl px-3 py-2 text-sm font-medium">
                            {money(Number(p.amount) - Number(p.received))} kam hai
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {payments.length < 3 && (
                  <button onClick={addRow} className="text-sm text-primary-700 font-medium py-1">
                    + Split payment (Cash + UPI)
                  </button>
                )}

                <div className="pt-2 border-t border-gray-100 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Paid</span>
                    <span>{money(totalPaid)}</span>
                  </div>
                  {balanceDue > 0 && (
                    <div className="flex justify-between text-red-500 font-medium">
                      <span>Balance Due (udhaar)</span>
                      <span>{money(balanceDue)}</span>
                    </div>
                  )}
                  {overpaid && <p className="text-red-500 font-medium">Payment bill total se zyada hai</p>}
                </div>
              </div>

              {/* Customer (optional, collapsed) */}
              <div className="card space-y-2">
                <button onClick={() => setShowCustomer(!showCustomer)} className="w-full flex justify-between items-center text-sm font-medium text-gray-700 min-h-[32px]">
                  <span>👤 Customer details (optional)</span>
                  <span>{showCustomer ? "−" : "+"}</span>
                </button>
                {showCustomer && (
                  <>
                    <input className="input-field" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    <input className="input-field" placeholder="Phone number" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </>
                )}
              </div>

              {/* Desktop: button yahin; mobile par neeche sticky bar mein hai */}
              <button onClick={handleCreateBill} disabled={submitting} className="hidden md:block btn-primary w-full text-lg">
                {generateLabel}
              </button>
            </>
          )}
        </section>
      </div>

      {/* ====== Mobile sticky checkout bar (bottom nav ke theek upar) ====== */}
      {cart.length > 0 && (
        <div
          className="md:hidden fixed left-0 right-0 z-20 px-3"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          {view === "menu" ? (
            <button
              onClick={() => setView("cart")}
              className="w-full bg-primary-600 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between active:scale-[0.98] transition"
            >
              <span className="text-sm font-medium">🛒 {cartCount} items</span>
              <span className="font-bold">{money(grandTotal)} · View Cart →</span>
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-2 flex items-center gap-2">
              <div className="pl-2 min-w-0">
                <p className="text-xs text-gray-500 leading-tight">Total</p>
                <p className="font-bold text-gray-800 leading-tight">{money(grandTotal)}</p>
                {changeTotal > 0 && <p className="text-xs font-bold text-green-700 leading-tight">Return {money(changeTotal)}</p>}
              </div>
              <button onClick={handleCreateBill} disabled={submitting} className="btn-primary flex-1">
                {submitting ? "Creating..." : "Generate Bill"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Billing;

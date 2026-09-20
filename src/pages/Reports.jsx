import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { toLocalDateStr } from "../utils/date.js";
import { useShop } from "../context/ShopContext.jsx";

const tabs = ["Sales", "Profit/Loss", "Payments", "Top Products"];

// Converts an array of flat objects into a CSV string and triggers a browser download
const downloadCSV = (filename, rows) => {
  if (!rows || rows.length === 0) {
    return false;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];
  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
};

const Reports = () => {
  const { shop } = useShop();
  const [activeTab, setActiveTab] = useState("Sales");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalDateStr(d);
  });
  const [to, setTo] = useState(() => toLocalDateStr(new Date()));
  const [sales, setSales] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [payments, setPayments] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get(`/reports/sales-summary?from=${from}&to=${to}`),
      api.get(`/reports/profit-loss?from=${from}&to=${to}`),
      api.get(`/reports/payments?from=${from}&to=${to}`),
      api.get(`/reports/top-products?from=${from}&to=${to}&limit=8`),
    ]);

    const [salesRes, pnlRes, paymentsRes, topRes] = results;

    if (salesRes.status === "fulfilled") setSales(salesRes.value.data);
    else console.error("Sales report failed:", salesRes.reason);

    if (pnlRes.status === "fulfilled") setPnl(pnlRes.value.data);
    else console.error("Profit/Loss report failed:", pnlRes.reason);

    if (paymentsRes.status === "fulfilled") setPayments(paymentsRes.value.data);
    else console.error("Payments report failed:", paymentsRes.reason);

    if (topRes.status === "fulfilled") setTopProducts(topRes.value.data);
    else console.error("Top products report failed:", topRes.reason);

    const anyFailed = results.some((r) => r.status === "rejected");
    if (anyFailed) {
      const firstError = results.find((r) => r.status === "rejected");
      toast.error(firstError.reason?.response?.data?.message || "Some report data failed to load - check console");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    let rows = [];
    let filename = "report.csv";

    if (activeTab === "Sales" && sales) {
      rows = Object.entries(sales.dayWise).map(([date, amount]) => ({ Date: date, "Sales Amount": amount.toFixed(2) }));
      filename = `sales-report-${from}-to-${to}.csv`;
    } else if (activeTab === "Profit/Loss" && pnl) {
      rows = Object.entries(pnl.productWise).map(([name, d]) => ({
        Product: name,
        "Quantity Sold": d.quantitySold,
        Revenue: d.revenue.toFixed(2),
        Cost: d.cost.toFixed(2),
        Profit: d.profit.toFixed(2),
      }));
      filename = `profit-loss-${from}-to-${to}.csv`;
    } else if (activeTab === "Payments" && payments) {
      rows = Object.entries(payments.modeWise).map(([mode, amount]) => ({ "Payment Mode": mode, Amount: amount.toFixed(2) }));
      filename = `payments-report-${from}-to-${to}.csv`;
    } else if (activeTab === "Top Products" && topProducts.length > 0) {
      rows = topProducts.map((p) => ({ Product: p.name, "Quantity Sold": p.quantitySold, Revenue: p.revenue.toFixed(2) }));
      filename = `top-products-${from}-to-${to}.csv`;
    }

    const success = downloadCSV(filename, rows);
    if (!success) toast.error("No data available to download for this tab");
    else toast.success("Report downloaded");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Reports</h2>

      <div className="card flex flex-col md:flex-row gap-2">
        <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={fetchAll} className="btn-primary md:w-32">Apply</button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                activeTab === t ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={handleDownload} className="btn-secondary text-sm px-3 py-2 whitespace-nowrap shrink-0">
          ⬇️ Download
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading reports...</p>
      ) : (
        <>
          {activeTab === "Sales" && sales && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="card"><p className="text-xs text-gray-500">Total Sales</p><p className="text-xl font-bold text-primary-700">₹{sales.totalSales.toFixed(0)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Total Bills</p><p className="text-xl font-bold">{sales.totalBills}</p></div>
                {shop.gstEnabled && (
                  <div className="card"><p className="text-xs text-gray-500">GST Collected</p><p className="text-xl font-bold">₹{sales.totalGstCollected.toFixed(0)}</p></div>
                )}
                <div className="card"><p className="text-xs text-gray-500">Avg Bill Value</p><p className="text-xl font-bold">₹{sales.avgBillValue.toFixed(0)}</p></div>
              </div>
              <div className="card">
                <p className="font-semibold text-gray-700 mb-2">Day-wise Sales</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {Object.entries(sales.dayWise).sort((a, b) => b[0].localeCompare(a[0])).map(([day, amt]) => (
                    <div key={day} className="flex justify-between text-sm border-b border-gray-50 py-1">
                      <span className="text-gray-600">{day}</span><span className="font-medium">₹{amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Profit/Loss" && pnl && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="card"><p className="text-xs text-gray-500">Revenue</p><p className="text-xl font-bold">₹{pnl.totalRevenue.toFixed(0)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Cost</p><p className="text-xl font-bold">₹{pnl.totalCost.toFixed(0)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Gross Profit</p><p className={`text-xl font-bold ${pnl.grossProfit >= 0 ? "text-green-600" : "text-red-500"}`}>₹{pnl.grossProfit.toFixed(0)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Margin</p><p className="text-xl font-bold">{pnl.profitMargin.toFixed(1)}%</p></div>
              </div>
              <div className="card">
                <p className="font-semibold text-gray-700 mb-2">Product-wise Profit</p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {Object.entries(pnl.productWise).sort((a, b) => b[1].profit - a[1].profit).map(([name, d]) => (
                    <div key={name} className="flex justify-between text-sm border-b border-gray-50 py-1">
                      <span className="text-gray-700">{name} ({d.quantitySold})</span>
                      <span className={`font-medium ${d.profit >= 0 ? "text-green-600" : "text-red-500"}`}>₹{d.profit.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Payments" && payments && (
            <div className="space-y-3">
              <div className="card">
                <p className="font-semibold text-gray-700 mb-2">Payment Mode Breakdown</p>
                {Object.entries(payments.modeWise).map(([mode, amt]) => (
                  <div key={mode} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{mode}</span><span className="font-medium">₹{amt.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="card border-red-200 bg-red-50">
                <p className="font-semibold text-red-700">Total Pending Dues: ₹{payments.totalPending.toFixed(2)}</p>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {payments.pendingBills.map((b, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-red-600">
                      <span>{b.billNumber} - {b.customerName}</span><span>₹{b.balanceDue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Top Products" && (
            <div className="card space-y-2">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-gray-50 py-1.5">
                  <span className="text-gray-700">#{idx + 1} {p.name}</span>
                  <span className="font-medium">{p.quantitySold} sold — ₹{p.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;

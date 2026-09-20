import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useShop } from "../context/ShopContext.jsx";
import ShopLogo from "../components/ShopLogo.jsx";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const BillView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shop } = useShop();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const { data } = await api.get(`/bills/${id}`);
        setBill(data);
      } catch (err) {
        toast.error("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!bill) return <p className="text-gray-400">Bill not found</p>;

  const billShop = shop;
  const showGst = billShop.gstEnabled;
  const out = billShop.output || {};

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/bills/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${bill.billNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  const shareOnWhatsApp = () => {
    const itemsText = bill.items
      .map((i) => `${i.name} x${i.quantity} = ₹${(i.lineTotal + i.gstAmount).toFixed(2)}`)
      .join("\n");
    const date = new Date(bill.createdAt).toLocaleDateString("en-IN");
    const gstLine = showGst ? `GST: ₹${bill.totalGst.toFixed(2)}\n` : "";
    const message =
      `*${billShop.name}*\nBill ${bill.billNumber}\n${date}\n\n${itemsText}\n\n${gstLine}` +
      `*Total: ₹${bill.grandTotal.toFixed(2)}*\nStatus: ${bill.paymentStatus}\n\nThank you! 🙏`;
    const phone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const printReceipt = async () => {
    setPrinting(true);
    try {
      const { data } = await api.get(`/bills/${id}/print`);
      // RawBT (free Android app) ye intent handle karta hai aur bytes seedha
      // Bluetooth/WiFi/USB thermal printer ko bhej deta hai.
      window.location.href = `intent:base64,${data.base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    } catch (err) {
      toast.error("Print failed - RawBT app installed hai na?");
    } finally {
      setTimeout(() => setPrinting(false), 1500);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/bills")} className="text-primary-700 font-medium py-2 pr-4 min-h-[44px]">
          ← Back
        </button>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-medium">{bill.paymentStatus}</span>
      </div>

      {/* ---------- Receipt ---------- */}
      <div className="card">
        <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
          <div className="flex justify-center mb-1">
            <ShopLogo size={64} />
          </div>
          {/* <h2 className="text-lg font-bold text-gray-800">{billShop.name}</h2> */}
          
          {billShop.address && <p className="text-xs text-gray-500">{billShop.address}</p>}
          {billShop.phone && <p className="text-xs text-gray-500">Ph: {billShop.phone}</p>}
          <p className="text-sm font-semibold text-gray-700 mt-2">{bill.billNumber}</p>
          <p className="text-xs text-gray-500">{new Date(bill.createdAt).toLocaleString("en-IN")}</p>
        </div>

        <div className="text-sm space-y-1 mb-3">
          {bill.orderType && (
            <p>
              <span className="text-gray-500">Order:</span> {bill.orderType}
              {bill.tableNo ? ` • Table ${bill.tableNo}` : ""}
            </p>
          )}
          <p>
            <span className="text-gray-500">Customer:</span> {bill.customerName}
          </p>
          {bill.customerPhone && (
            <p>
              <span className="text-gray-500">Phone:</span> {bill.customerPhone}
            </p>
          )}
          {/* {bill.createdBy?.name && (
            <p>
              <span className="text-gray-500">Billed by:</span> {bill.createdBy.name}
            </p>
          )} */}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
          {bill.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.name} x{item.quantity}
              </span>
              <span className="font-medium">{money(item.lineTotal + item.gstAmount)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 mt-3 pt-3 space-y-1 text-sm">
          {(showGst || bill.discount > 0) && (
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{money(bill.subtotal)}</span>
            </div>
          )}
          {showGst && (
            <div className="flex justify-between text-gray-600">
              <span>GST</span>
              <span>{money(bill.totalGst)}</span>
            </div>
          )}
          {bill.discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-{money(bill.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1">
            <span>Total</span>
            <span>{money(bill.grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-sm space-y-1">
          {bill.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between text-gray-600">
              <span>Paid ({p.mode})</span>
              <span>{money(p.amount)}</span>
            </div>
          ))}
          {bill.changeReturned > 0 && (
            <>
              <div className="flex justify-between text-gray-600">
                <span>Cash given</span>
                <span>{money(bill.cashReceived)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Change returned</span>
                <span>{money(bill.changeReturned)}</span>
              </div>
            </>
          )}
          {bill.balanceDue > 0 && (
            <div className="flex justify-between text-red-500 font-semibold pt-1">
              <span>Balance Due</span>
              <span>{money(bill.balanceDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Actions (shop ke hisaab se) ---------- */}
      {out.thermal && (
        <button onClick={printReceipt} disabled={printing} className="btn-primary w-full text-lg">
          {printing ? "Printing..." : "🖨️ Print Receipt (Bluetooth)"}
        </button>
      )}

      {(out.pdf || out.whatsapp) && (
        <div className={`grid gap-3 ${out.pdf && out.whatsapp ? "grid-cols-2" : "grid-cols-1"}`}>
          {out.pdf && (
            <button onClick={downloadPDF} className="btn-secondary">
              📄 Download PDF
            </button>
          )}
          {out.whatsapp && (
            <button onClick={shareOnWhatsApp} className="btn-primary">
              💬 Share WhatsApp
            </button>
          )}
        </div>
      )}

      {/* Print nahi karna? Seedha agla bill */}
      <Link to="/billing" className={`block text-center w-full ${out.thermal ? "btn-secondary" : "btn-primary"}`}>
        {out.thermal ? "Skip print → New Bill" : "＋ New Bill"}
      </Link>

      {out.thermal && (
        <p className="text-xs text-gray-400 text-center">
          Print ke liye RawBT app aur Bluetooth printer connected hona chahiye.
        </p>
      )}
    </div>
  );
};

export default BillView;

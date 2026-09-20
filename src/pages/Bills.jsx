import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const statusColor = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Pending: "bg-red-100 text-red-700",
};

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      const { data } = await api.get(`/bills?${params.toString()}`);
      setBills(data);
    } catch (err) {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Bills</h2>

      <div className="card flex flex-col md:flex-row gap-2">
        <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={fetchBills} className="btn-primary md:w-32">Filter</button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : bills.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No bills yet</p>
      ) : (
        <div className="space-y-2">
          {bills.map((b) => (
            <Link key={b._id} to={`/bills/${b._id}`} className="card flex items-center justify-between block">
              <div>
                <p className="font-semibold text-gray-800">{b.billNumber}</p>
                <p className="text-xs text-gray-500">{b.customerName} • {new Date(b.createdAt).toLocaleString("en-IN")}</p>
                {b.createdBy?.name && <p className="text-xs text-gray-400">by {b.createdBy.name}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">₹{b.grandTotal.toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.paymentStatus]}`}>
                  {b.paymentStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bills;

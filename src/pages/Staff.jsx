import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const Staff = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } catch (err) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      toast.success("Staff account created");
      setForm({ name: "", email: "", password: "", role: "staff" });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create account");
    }
  };

  const toggleActive = async (id) => {
    try {
      await api.patch(`/auth/users/${id}/toggle-active`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Staff Accounts</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-3 py-2">+ Add Staff</button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u._id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{u.name} {u.role === "admin" && "👑"}</p>
                <p className="text-xs text-gray-500">{u.email} • {u.role}</p>
              </div>
              {u.role !== "admin" && (
                <button
                  onClick={() => toggleActive(u._id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    u.isActive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  }`}
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-30">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-5">
            <h3 className="text-lg font-bold mb-4">Add Staff Member</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required className="input-field" placeholder="Full name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input required type="email" className="input-field" placeholder="Email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input required type="password" minLength={6} className="input-field" placeholder="Password (min 6 chars)" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;

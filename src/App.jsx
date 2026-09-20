import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Billing from "./pages/Billing.jsx";
import Bills from "./pages/Bills.jsx";
import BillView from "./pages/BillView.jsx";
import Reports from "./pages/Reports.jsx";
import Staff from "./pages/Staff.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute><Layout><Billing /></Layout></ProtectedRoute>
        } />

        <Route path="/bills" element={
          <ProtectedRoute><Layout><Bills /></Layout></ProtectedRoute>
        } />

        <Route path="/bills/:id" element={
          <ProtectedRoute><Layout><BillView /></Layout></ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute adminOnly><Layout><Products /></Layout></ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute adminOnly><Layout><Reports /></Layout></ProtectedRoute>
        } />

        <Route path="/staff" element={
          <ProtectedRoute adminOnly><Layout><Staff /></Layout></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;

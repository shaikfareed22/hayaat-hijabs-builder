import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCollections from "./pages/admin/AdminCollections";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public + user routes with Navbar/Footer */}
              <Route
                path="/"
                element={
                  <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <main className="flex-1">
                      <Index />
                    </main>
                    <Footer />
                  </div>
                }
              />
              <Route
                path="/login"
                element={
                  <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <main className="flex-1"><Login /></main>
                    <Footer />
                  </div>
                }
              />
              <Route
                path="/signup"
                element={
                  <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <main className="flex-1"><Signup /></main>
                    <Footer />
                  </div>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <main className="flex-1"><ResetPassword /></main>
                    <Footer />
                  </div>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex flex-col">
                      <Navbar />
                      <main className="flex-1"><Account /></main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex flex-col">
                      <Navbar />
                      <main className="flex-1"><Orders /></main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex flex-col">
                      <Navbar />
                      <main className="flex-1"><Checkout /></main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order-confirmation/:orderId"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen flex flex-col">
                      <Navbar />
                      <main className="flex-1"><OrderConfirmation /></main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes — full-screen layout (no Navbar/Footer) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="collections" element={<AdminCollections />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

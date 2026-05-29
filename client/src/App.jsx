import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';

import AdminLayout from './components/AdminLayout';
import DashboardOverview from './pages/Admin/DashboardOverview';
import UserManagement from './pages/Admin/UserManagement';
import CameraMonitor from './pages/Admin/CameraMonitor';
import ViolationLogs from './pages/Admin/ViolationLogs';
import UserTracking from './pages/Admin/UserTracking';
import AdminProfile from './pages/Admin/AdminProfile';
import AnalyticsHub from './pages/Admin/AnalyticsHub';
import AISandbox from './pages/Admin/AISandbox';
import Messages from './pages/Admin/Messages';

function App() {
  const PrivateRoute = ({ children }) => {
     const token = sessionStorage.getItem('token');
     return token ? children : <Navigate to="/login" />;
  };

  const AdminRoute = ({ children }) => {
      const token = sessionStorage.getItem('token');
      const role = sessionStorage.getItem('role');
      // No session → go to login (so pasting /supervisor in a new tab
      // prompts the user to sign in instead of silently letting them in).
      if (!token) return <Navigate to="/login" replace />;
      if (role !== 'admin' && role !== 'supervisor') return <Navigate to="/" replace />;
      return children;
  };

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/supervisor');

  return (
    <ThemeProvider>
    <div className="App dark:bg-gray-900 min-h-screen relative">
       {!isAdminRoute && <Navbar />}
       <Routes>
           <Route path="/" element={<Home />} />
           <Route path="/about" element={<About />} />
           <Route path="/contact" element={<Contact />} />
           
           <Route path="/login" element={<Login />} />
           <Route path="/signup" element={<Signup />} />
           <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/reset-password/:token" element={<ResetPassword />} />
           
           <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
           
            {/* Admin Routes */}
           <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
               <Route index element={<DashboardOverview />} />
               <Route path="users" element={<UserManagement />} />
               <Route path="tracking" element={<UserTracking />} />
               <Route path="cameras" element={<CameraMonitor />} />
               <Route path="logs" element={<ViolationLogs />} />
               <Route path="analytics" element={<AnalyticsHub />} />
               <Route path="sandbox" element={<AISandbox />} />
               <Route path="messages" element={<Messages />} />
               <Route path="profile" element={<AdminProfile />} />
           </Route>

           {/* Supervisor Routes */}
           <Route path="/supervisor" element={<AdminRoute><AdminLayout /></AdminRoute>}>
               <Route index element={<DashboardOverview />} />
               <Route path="users" element={<UserManagement />} />
               <Route path="tracking" element={<UserTracking />} />
               <Route path="cameras" element={<CameraMonitor />} />
               <Route path="logs" element={<ViolationLogs />} />
               <Route path="analytics" element={<AnalyticsHub />} />
               <Route path="sandbox" element={<AISandbox />} />
               <Route path="messages" element={<Messages />} />
               <Route path="profile" element={<AdminProfile />} />
           </Route>
       </Routes>
    </div>
    </ThemeProvider>
  )
}

export default App

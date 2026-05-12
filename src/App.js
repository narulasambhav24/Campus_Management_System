import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

import StudentDashboard from './pages/student/StudentDashboard';
import SubmitRequest from './pages/student/SubmitRequest';
import MyRequests from './pages/student/MyRequests';
import RequestDetail from './pages/student/RequestDetail';
import StudentProfile from './pages/student/StudentProfile';
import StudentEvents from './pages/student/StudentEvents';
import PolicyLibrary from './pages/PolicyLibrary';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import { getDefaultRoute } from './utils/auth';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={getDefaultRoute(user)} replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <SignupPage />} />

      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/submit" element={<ProtectedRoute role="student"><SubmitRequest /></ProtectedRoute>} />
      <Route path="/student/requests" element={<ProtectedRoute role="student"><MyRequests /></ProtectedRoute>} />
      <Route path="/student/requests/:id" element={<ProtectedRoute role="student"><RequestDetail /></ProtectedRoute>} />
      <Route path="/student/events" element={<ProtectedRoute role="student"><StudentEvents /></ProtectedRoute>} />
      <Route path="/student/policies" element={<ProtectedRoute role="student"><PolicyLibrary /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute role="admin"><AdminEvents /></ProtectedRoute>} />
      <Route path="/admin/policies" element={<ProtectedRoute role="admin"><PolicyLibrary /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={user ? getDefaultRoute(user) : '/'} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
 

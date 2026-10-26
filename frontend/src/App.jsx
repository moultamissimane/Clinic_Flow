import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Appointments from './pages/Appointments';
import Users from './pages/Users';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetails />} />
          <Route path="appointments" element={<Appointments />} />
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="users" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Users from './pages/Users';
import NewUser from './pages/NewUser';
import EditUser from './pages/EditUser';
import Calls from './pages/Calls';
import NewCall from './pages/NewCall';
import EditCall from './pages/EditCall';
import ChamadoLocais from './pages/ChamadoLocais';
import NewChamadoLocal from './pages/NewChamadoLocal';
import EditChamadoLocal from './pages/EditChamadoLocal';
import Departamentos from './pages/Departamentos';
import NewDepartamento from './pages/NewDepartamento';
import EditDepartamento from './pages/EditDepartamento';
import WhatsApp from './pages/WhatsApp';
import Reports from './pages/Reports';
import PrivateRoute from './components/PrivateRoute';
import ToastProvider from './components/toast/ToastProvider';

const App: React.FC = () => {
    return (
        <Router>
            <ToastProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/home"
                    element={
                        <PrivateRoute>
                            <Home />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/users"
                    element={
                        <PrivateRoute>
                            <Users />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/users/new"
                    element={
                        <PrivateRoute>
                            <NewUser />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/users/edit/:id"
                    element={
                        <PrivateRoute>
                            <EditUser />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/calls"
                    element={
                        <PrivateRoute>
                            <Calls />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/calls/new"
                    element={
                        <PrivateRoute>
                            <NewCall />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/calls/edit/:id"
                    element={
                        <PrivateRoute>
                            <EditCall />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/chamado-locais"
                    element={
                        <PrivateRoute>
                            <ChamadoLocais />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/chamado-locais/new"
                    element={
                        <PrivateRoute>
                            <NewChamadoLocal />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/chamado-locais/edit/:id"
                    element={
                        <PrivateRoute>
                            <EditChamadoLocal />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/departamentos"
                    element={
                        <PrivateRoute>
                            <Departamentos />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/departamentos/new"
                    element={
                        <PrivateRoute>
                            <NewDepartamento />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/departamentos/edit/:id"
                    element={
                        <PrivateRoute>
                            <EditDepartamento />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/whatsapp"
                    element={
                        <PrivateRoute>
                            <WhatsApp />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <PrivateRoute>
                            <Reports />
                        </PrivateRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
            </ToastProvider>
        </Router>
    );
};

export default App;

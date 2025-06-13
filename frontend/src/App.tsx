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
import WhatsApp from './pages/WhatsApp';
import PrivateRoute from './components/PrivateRoute';

const App: React.FC = () => {
    return (
        <Router>
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
                    path="/whatsapp"
                    element={
                        <PrivateRoute>
                            <WhatsApp />
                        </PrivateRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

export default App;

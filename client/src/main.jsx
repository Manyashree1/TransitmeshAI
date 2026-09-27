import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';import './index.css';import {AuthProvider,useAuth} from './context/AuthContext';import Layout from './components/Layout';import ProtectedRoute from './components/ProtectedRoute';import AuthPage from './pages/AuthPage';import LandingPage from './pages/LandingPage';import PassengerPage from './pages/PassengerPage';import DriverPage from './pages/DriverPage';import AdminPage from './pages/AdminPage';function Home(){const {user}=useAuth();return user?<Navigate to={`/${user.role.toLowerCase()}`}/>:<LandingPage/>}function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage initialRegister/>}/><Route element={<ProtectedRoute><Layout/></ProtectedRoute>}><Route path="/passenger" element={<ProtectedRoute roles={['PASSENGER']}><PassengerPage/></ProtectedRoute>}/><Route path="/driver" element={<ProtectedRoute roles={['DRIVER']}><DriverPage/></ProtectedRoute>}/><Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPage/></ProtectedRoute>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider><App/></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);


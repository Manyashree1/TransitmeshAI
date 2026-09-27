import React from 'react';import {Navigate} from 'react-router-dom';import {useAuth} from '../context/AuthContext';export default function ProtectedRoute({roles,children}){const {user}=useAuth();return !user?<Navigate to="/login" replace/>:roles&&!roles.includes(user.role)?<Navigate to={`/${user.role.toLowerCase()}`} replace/>:children}


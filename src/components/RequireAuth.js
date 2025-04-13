import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const RequireAuth = ({ allowedRoles }) => {
    const token = localStorage.getItem("auth");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);
        const userRole = decoded.rol_nombre;

        if (allowedRoles.includes(userRole)) {
            return <Outlet />;
        }
    } catch (err) {
        console.error("Error al decodificar el token", err);
    }

    return <Navigate to="/unauthorized" replace />;
};

export default RequireAuth;

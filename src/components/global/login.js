import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const decodedToken = jwtDecode(data.token);
        const userRole = decodedToken.rol_nombre;
        const userID = decodedToken.id;
        
        localStorage.setItem("userID", userID);
        localStorage.setItem("auth", data.token);
        localStorage.setItem("role", userRole);
        localStorage.setItem("username", username);
        
        navigate("/home");
      } else {
        setError(data.message || "Usuario o contraseña incorrectos");
      }
    } catch (error) {
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <div className="card shadow-lg border-0" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="card-header bg-primary text-white text-center py-3">
          <h4 className="mb-0">Iniciar Sesión</h4>
        </div>
        <div className="card-body p-4">
          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                <i className="bi bi-person me-2"></i>Usuario
              </label>
              <input
                type="text"
                className="form-control"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su nombre de usuario"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                <i className="bi bi-lock me-2"></i>Contraseña
              </label>
              <div className="input-group">
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>
            
            <div className="d-grid">
              <button 
                type="submit" 
                className="btn btn-primary py-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Cargando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Ingresar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;


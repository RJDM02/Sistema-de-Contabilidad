import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const InsertarUsuario = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: ""
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth");

       await axios.post(
        "http://localhost:8000/api/usuario/",
        {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(true);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         Object.values(error.response?.data || {}).join("\n") ||
                         "Error al crear el usuario";
      setError(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestTrabajador/listaTrabajadores");
  };

  const handleCreateAnother = () => {
    setFormData({
      username: "",
      email: "",
      first_name: "",
      last_name: ""
    });
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="container mt-4">
      <h2>Insertar Nuevo Usuario</h2>
      
      {success ? (
        <div className="alert alert-success">
          <h4>¡Usuario creado exitosamente!</h4>
          <div className="d-flex gap-2 mt-3">
            <button 
              className="btn btn-primary"
              onClick={handleBackToList}
            >
              Volver a la lista
            </button>
            <button 
              className="btn btn-outline-primary"
              onClick={handleCreateAnother}
            >
              Crear otro usuario
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label"><strong>Username*:</strong></label>
              <input
                type="text"
                className="form-control"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label"><strong>Email:</strong></label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label"><strong>Nombre:</strong></label>
              <input
                type="text"
                className="form-control"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label"><strong>Apellido:</strong></label>
              <input
                type="text"
                className="form-control"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleBackToList}
                disabled={loading}
              >
                Cancelar
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || !formData.username}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creando...
                  </>
                ) : "Crear Usuario"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default InsertarUsuario;


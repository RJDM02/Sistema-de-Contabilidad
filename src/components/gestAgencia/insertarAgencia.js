import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarAgencia = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
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

      const response = await axios.post(
        "https://sistemacontable-wico.onrender.com/api/crear_agencia/",
        {
          nombre: formData.nombre,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Agencia creada exitosamente");
      setSuccess(true);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         Object.values(error.response?.data || {}).join("\n") ||
                         "Error al crear la agencia";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestAgencia/listarAgencias"); // Ajusta esta ruta según tu enrutamiento
  };

  const handleCreateAnother = () => {
    setFormData({
      nombre: "",
    });
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="container mt-4">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <h2>Insertar Nueva Agencia</h2>
      
      {success ? (
        <div className="alert alert-success">
          <h4>¡Agencia creada exitosamente!</h4>
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
              Crear otra Agencia
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="nombre" className="form-label">
                <strong>Nombre de la Agencia:</strong>
              </label>
              <input
                type="text"
                className="form-control"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ingrese el nombre de la agencia"
                required
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
                disabled={loading || !formData.nombre}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creando...
                  </>
                ) : "Crear Agencia"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default InsertarAgencia;
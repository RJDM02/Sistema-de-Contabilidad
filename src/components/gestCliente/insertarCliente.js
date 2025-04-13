import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const InsertarCliente = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "", // Este será "1" o "2" como string
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Opciones para el select de categoría
  const categorias = [
    { value: "1", label: "Terapia" },
    { value: "2", label: "TCM" }
  ];

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
        "http://localhost:8000/api/create_client/",
        {
          nombre: formData.nombre,
          categoria: parseInt(formData.categoria), // Convertimos a número
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
                         "Error al crear el cliente";
      setError(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestCliente/listarClientes");
  };

  const handleCreateAnother = () => {
    setFormData({
      nombre: "",
      categoria: "",
    });
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="container mt-4">
      <h2>Insertar Nuevo Cliente</h2>
      
      {success ? (
        <div className="alert alert-success">
          <h4>¡Cliente creado exitosamente!</h4>
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
              Crear otro Cliente
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="nombre" className="form-label"><strong>Nombre:</strong></label>
              <input
                type="text"
                className="form-control"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="categoria" className="form-label"><strong>Categoría:</strong></label>
              <select
                className="form-select"
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Seleccione una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
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
                disabled={loading || !formData.nombre || !formData.categoria}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creando...
                  </>
                ) : "Crear Cliente"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default InsertarCliente;
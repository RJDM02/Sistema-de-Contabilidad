import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ModificarTrabajador = () => {
  const { id } = useParams();
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

  // Cargar datos del trabajador al montar el componente
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        
        const response = await axios.get(`http://localhost:8000/api/usuario/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFormData({
          username: response.data.username,
          email: response.data.email || "",
          first_name: response.data.first_name || "",
          last_name: response.data.last_name || ""
        });
      } catch (error) {
        setError("Error al cargar los datos del trabajador");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [id]);

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

      await axios.put(
        `http://localhost:8000/api/update_user/${id}/`,
        formData,
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
                         "Error al actualizar el trabajador";
      setError(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestTrabajador/listaTrabajadores");
  };

  if (loading && !formData.username) return <div className="text-center mt-4">Cargando...</div>;

  return (
    <div className="container mt-4">
      <h2>Modificar Trabajador</h2>
      
      {success ? (
        <div className="alert alert-success">
          <h4>¡Trabajador actualizado exitosamente!</h4>
          <button 
            className="btn btn-primary mt-3"
            onClick={handleBackToList}
          >
            Volver a la lista de trabajadores
          </button>
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
                    Actualizando...
                  </>
                ) : "Actualizar Trabajador"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ModificarTrabajador;
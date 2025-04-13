import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ModificarCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: ""
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Opciones para el select de categoría
  const categorias = [
    { value: "1", label: "Terapia" },
    { value: "2", label: "TCM" }
  ];

  // Cargar datos del cliente al montar el componente
  useEffect(() => {
    const fetchCliente = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        
        const response = await axios.get(`http://localhost:8000/api/detail_client/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFormData({
          nombre: response.data.nombre,
          categoria: String(response.data.categoria) // Convertimos a string para el select
        });
      } catch (error) {
        setError("Error al cargar los datos del cliente");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
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
        `http://localhost:8000/api/update_client/${id}/`,
        {
          nombre: formData.nombre,
          categoria: parseInt(formData.categoria) // Convertimos a número para el backend
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
                         "Error al actualizar el cliente";
      setError(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestCliente/listarClientes");
  };

  if (loading && !formData.nombre) return <div className="text-center mt-4">Cargando...</div>;

  return (
    <div className="container mt-4">
      <h2>Modificar Cliente</h2>
      
      {success ? (
        <div className="alert alert-success">
          <h4>¡Cliente actualizado exitosamente!</h4>
          <button 
            className="btn btn-primary mt-3"
            onClick={handleBackToList}
          >
            Volver a la lista de clientes
          </button>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label"><strong>Nombre*:</strong></label>
              <input
                type="text"
                className="form-control"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label"><strong>Categoría*:</strong></label>
              <select
                className="form-select"
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
                    Actualizando...
                  </>
                ) : "Actualizar Cliente"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ModificarCliente;
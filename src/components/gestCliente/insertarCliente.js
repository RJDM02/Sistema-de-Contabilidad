import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const InsertarCliente = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "", // Este será "1" o "2" como string
    agencia: [], // Cambiado a array para múltiples selecciones
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agencias, setAgencias] = useState([]);
  const [loadingAgencias, setLoadingAgencias] = useState(true);

  // Opciones para el select de categoría
  const categorias = [
    { value: "1", label: "Terapia" },
    { value: "2", label: "TCM" }
  ];

  // Cargar las agencias al montar el componente
  useEffect(() => {
    const fetchAgencias = async () => {
      try {
        const token = localStorage.getItem("auth");
        const response = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/listar_agencia/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setAgencias(response.data);
      } catch (error) {
        console.error("Error al cargar las agencias:", error);
      } finally {
        setLoadingAgencias(false);
      }
    };

    fetchAgencias();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejador específico para el select múltiple de agencias
  const handleAgenciaChange = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(parseInt(options[i].value));
      }
    }
    setFormData(prev => ({
      ...prev,
      agencia: selectedValues
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth");

      await axios.post(
        "https://sistemacontable-wico.onrender.com/api/create_client/",
        {
          nombre: formData.nombre,
          categoria: parseInt(formData.categoria), // Convertimos a número
          agencia: formData.agencia, // Ahora es un array de IDs
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
      agencia: [],
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
            
            <div className="mb-3">
              <label htmlFor="agencia" className="form-label"><strong>Agencia(s):</strong></label>
              <select
                className="form-select"
                id="agencia"
                name="agencia"
                multiple // Hace que el select sea múltiple
                size="5" // Muestra 5 opciones a la vez (ajustable)
                value={formData.agencia}
                onChange={handleAgenciaChange}
                required={formData.agencia.length === 0} // Requiere al menos una selección
                disabled={loading || loadingAgencias}
              >
                {agencias.map((agencia) => (
                  <option key={agencia.id} value={agencia.id}>
                    {agencia.nombre}
                  </option>
                ))}
              </select>
              <small className="text-muted">Mantén presionado Ctrl (Windows) o Command (Mac) para seleccionar múltiples opciones</small>
              {loadingAgencias && <div className="mt-2 text-muted">Cargando agencias...</div>}
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
                disabled={loading || !formData.nombre || !formData.categoria || formData.agencia.length === 0}
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
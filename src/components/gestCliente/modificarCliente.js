import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ModificarCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    agencia: [] // Cambiado a array para múltiples selecciones
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

  // Cargar datos del cliente y agencias al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        
        // Cargar agencias
        const agenciasResponse = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/listar_agencia/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAgencias(agenciasResponse.data);
        
        // Cargar datos del cliente
        const clienteResponse = await axios.get(
          `https://sistemacontable-wico.onrender.com/api/detail_client/${id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Convertir array de objetos agencia a array de IDs
        const agenciaIds = clienteResponse.data.agencia?.map(ag => ag.id) || [];
        
        setFormData({
          nombre: clienteResponse.data.nombre,
          categoria: String(clienteResponse.data.categoria),
          agencia: agenciaIds
        });
      } catch (error) {
        setError("Error al cargar los datos");
        console.error(error);
      } finally {
        setLoading(false);
        setLoadingAgencias(false);
      }
    };

    fetchData();
  }, [id]);

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

      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/update_client/${id}/`,
        {
          nombre: formData.nombre,
          categoria: parseInt(formData.categoria),
          agencia: formData.agencia // Ahora es un array de IDs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Cliente actualizado exitosamente");
      setSuccess(true);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         Object.values(error.response?.data || {}).join("\n") ||
                         "Error al actualizar el cliente";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/gestCliente/listarClientes");
  };

  if ((loading && !formData.nombre) || loadingAgencias) {
    return <div className="text-center mt-4">Cargando...</div>;
  }

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
            
            <div className="mb-3">
              <label className="form-label"><strong>Agencia(s)*:</strong></label>
              <select
                className="form-select"
                name="agencia"
                multiple
                size="5"
                value={formData.agencia}
                onChange={handleAgenciaChange}
                required={formData.agencia.length === 0}
                disabled={loading || loadingAgencias}
              >
                {agencias.map((agencia) => (
                  <option key={agencia.id} value={agencia.id}>
                    {agencia.nombre}
                  </option>
                ))}
              </select>
              <small className="text-muted">Mantén presionado Ctrl (Windows) o Command (Mac) para seleccionar múltiples opciones</small>
              <div className="mt-1">
                <small className="text-muted">Seleccionadas: {formData.agencia.length} agencia(s)</small>
              </div>
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
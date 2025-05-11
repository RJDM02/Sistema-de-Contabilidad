import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ModificarTrabajador = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    ID_user: "",
    dir: "",
    phone: "",
    servicio: "tcm",
    subir_notas: false
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
        
        const response = await axios.get(`https://sistemacontable-wico.onrender.com/api/usuario/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFormData({
          username: response.data.username,
          email: response.data.email || "",
          first_name: response.data.first_name || "",
          last_name: response.data.last_name || "",
          ID_user: response.data.ID_user || "",
          dir: response.data.dir || "",
          phone: response.data.phone || "",
          servicio: response.data.servicio || "tcm",
          subir_notas: response.data.subir_notas || false
        });
      } catch (error) {
        setError("Error al cargar los datos del trabajador");
        toast.error("Error al cargar los datos del trabajador");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth");

      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/update_user/${id}/`,
        {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          ID_user: formData.ID_user,
          dir: formData.dir,
          phone: formData.phone,
          servicio: formData.servicio,
          subir_notas: formData.subir_notas
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Trabajador actualizado exitosamente");
      setSuccess(true);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         Object.values(error.response?.data || {}).join("\n") ||
                         "Error al actualizar el trabajador";
      setError(errorMessage);
      toast.error(errorMessage);
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
            <div className="row">
              <div className="col-md-6 mb-3">
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
              
              <div className="col-md-6 mb-3">
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
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
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
              
              <div className="col-md-6 mb-3">
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
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label"><strong>ID:</strong></label>
                <input
                  type="text"
                  className="form-control"
                  name="ID_user"
                  value={formData.ID_user}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label"><strong>Teléfono:</strong></label>
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Dirección:</strong></label>
              <input
                type="text"
                className="form-control"
                name="dir"
                value={formData.dir}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Servicio*:</strong></label>
              <select
                className="form-select"
                name="servicio"
                value={formData.servicio}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="tcm">TCM</option>
                <option value="terapia">Terapia</option>
              </select>
            </div>
            
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="subir_notas"
                checked={formData.subir_notas}
                onChange={handleChange}
                id="subirNotasCheck"
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="subirNotasCheck">
                <strong>¿Puede subir notas?</strong>
              </label>
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
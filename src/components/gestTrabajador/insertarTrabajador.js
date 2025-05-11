import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarUsuario = () => {
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
  
      const userData = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        ID_user: formData.ID_user,
        dir: formData.dir,
        phone: formData.phone,
        servicio: formData.servicio,
        subir_notas: formData.subir_notas,
        is_active: true, 
      };
  
      const response = await axios.post(
        "https://sistemacontable-wico.onrender.com/api/usuario/",
        userData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          timeout: 10000
        }
      );
  
      console.log("Respuesta del servidor:", response.data);
      toast.success("Usuario creado exitosamente");
      setSuccess(true);
  
    } catch (error) {
      let errorDetails = "Error al crear el usuario";
      
      if (error.response) {
        console.error("Error completo:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
  
        if (error.response.status === 500) {
          if (typeof error.response.data === 'string' && error.response.data.includes('<!doctype html>')) {
            errorDetails = "Error interno del servidor (500) - Contacte al administrador";
          } else {
            errorDetails = JSON.stringify(error.response.data, null, 2);
          }
        } else {
          errorDetails = error.response.data?.detail || 
                        error.response.data?.message || 
                        Object.entries(error.response.data || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
        }
      } else if (error.request) {
        errorDetails = "El servidor no respondió";
      } else {
        errorDetails = error.message;
      }
  
      setError(errorDetails);
      toast.error(errorDetails);
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
      last_name: "",
      ID_user: "",
      dir: "",
      phone: "",
      servicio: "tcm",
      subir_notas: false
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

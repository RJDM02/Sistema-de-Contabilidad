import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarClientes = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        const response = await axios.get("http://localhost:8000/api/list_client/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsuarios(response.data);
        toast.success("Clientes cargados correctamente");
      } catch (error) {
        console.error("Error al obtener los clientes", error);
        setError("Error al cargar la lista de clientes");
        toast.error("Error al cargar los clientes");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const handleModificar = (id) => {
    navigate(`/gestCliente/modificarCliente/${id}`);
  };

  const handleInsertarCliente = () => {
    navigate("/gestCliente/insertarCliente");
  };

  const handleToggleEstado = async (id, currentState) => {
    try {
      setUpdating(id);
      const token = localStorage.getItem("auth");

      await axios.delete(
        `http://localhost:8000/api/desactivate_activate_client/${id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar el estado local
      setUsuarios(usuarios.map(usuario =>
        usuario.id === id ? { ...usuario, estado: !currentState } : usuario
      ));
      
      toast.success(`Cliente ${!currentState ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error("Error al cambiar el estado del cliente", error);
      const errorMessage = error.response?.data?.detail || "Error al cambiar el estado del cliente";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const getCategoriaText = (categoriaValue) => {
    switch(categoriaValue) {
      case 1:
        return "Terapia";
      case 2:
        return "TCM";
      default:
        return categoriaValue; 
    }
  };

  return (
    <div className="container mt-4">
      {/* Contenedor de notificaciones - debe estar en el componente raíz */}
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
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lista de Usuarios</h2>
        <button
          onClick={handleInsertarCliente}
          className="btn btn-primary"
        >
          Insertar Cliente
        </button>
      </div>

      {loading && <div className="text-center">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Fecha creación</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.creado}</td>
                  <td>{getCategoriaText(usuario.categoria)}</td>
                  <td>
                    <span className={`badge ${usuario.estado ? 'bg-success' : 'bg-secondary'}`}>
                      {usuario.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button 
                        onClick={() => handleModificar(usuario.id)}
                        className="btn btn-sm btn-warning"
                        disabled={updating === usuario.id}
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => handleToggleEstado(usuario.id, usuario.estado)}
                        className={`btn btn-sm ${usuario.estado ? 'btn-danger' : 'btn-success'}`}
                        disabled={updating === usuario.id}
                      >
                        {updating === usuario.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : usuario.estado ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListarClientes;
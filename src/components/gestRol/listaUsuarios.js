import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ListaUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        const response = await axios.get("https://sistemacontable-wico.onrender.com/api/usuario/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsuarios(response.data);
      } catch (error) {
        console.error("Error al obtener los usuarios", error);
        setError("Error al cargar la lista de usuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const handleModificar = (id) => {
    navigate(`/modificarRol/${id}`);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lista de Usuarios</h2>
      </div>

      {loading && <div className="text-center">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.rol?.nombre || 'Sin rol'}</td>
                  <td>
                    <button 
                      onClick={() => handleModificar(usuario.id)}
                      className="btn btn-sm btn-warning"
                    >
                      Modificar
                    </button>
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

export default ListaUsuarios;


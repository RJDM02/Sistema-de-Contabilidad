import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ModificarRol = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("auth");
        
        const [userResponse, rolesResponse] = await Promise.all([
          axios.get(`https://sistemacontable-wico.onrender.com/api/usuario/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://sistemacontable-wico.onrender.com/api/rol/", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setUsuario(userResponse.data);
        setRoles(rolesResponse.data);
        setRolSeleccionado(userResponse.data.rol?.id || "");
      } catch (error) {
        setError("Error al cargar los datos");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChangeRol = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth");

      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/update_rol/${id}/`,
        { rol: Number(rolSeleccionado) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Rol actualizado correctamente");
      navigate("/gestRol/listaUsuarios");
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         "Error al actualizar el rol";
      setError(errorMessage);
      console.error("Error completo:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!usuario) return <p>No se encontró el usuario</p>;

  return (
    <div className="container mt-4">
      <h2>Modificar Rol de Usuario</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="mb-3">
        <label className="form-label"><strong>Usuario:</strong></label>
        <p>{usuario.username}</p>
      </div>
      
      <div className="mb-3">
        <label className="form-label"><strong>Rol Actual:</strong></label>
        <p>{usuario.rol?.nombre || "Sin rol asignado"}</p>
      </div>
      
      <div className="mb-3">
        <label className="form-label"><strong>Nuevo Rol:</strong></label>
        <select
          className="form-select"
          value={rolSeleccionado}
          onChange={(e) => setRolSeleccionado(e.target.value)}
          disabled={loading}
        >
          <option value="">Seleccione un rol</option>
          {roles.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
            </option>
          ))}
        </select>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleChangeRol}
        disabled={loading || !rolSeleccionado}
      >
        {loading ? "Guardando..." : "Actualizar Rol"}
      </button>
    </div>
  );
};

export default ModificarRol;
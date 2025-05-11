import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ListaTrabajadores = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
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

                if (!token) {
                    navigate("/login");
                    return;
                }

                // Decodificar el token para extraer user_id
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                const userId = decodedToken.user_id;

                const [userResp, usuariosResp] = await Promise.all([
                    axios.get(`https://sistemacontable-wico.onrender.com/api/usuario/${userId}/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("https://sistemacontable-wico.onrender.com/api/usuario/", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                setCurrentUser(userResp.data);
                setUsuarios(usuariosResp.data);
            } catch (error) {
                console.error("Error al obtener los usuarios", error);
                setError("Error al cargar la lista de trabajadores");

                if (error.response?.status === 401) {
                    localStorage.removeItem("auth");
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, [navigate]);

    const handleInsertarTrabajador = () => {
        navigate("/gestTrabajador/insertarTrabajador");
    };

    const handleModificarTrabajador = (id) => {
        navigate(`/gestTrabajador/modificarTrabajador/${id}`);
    };

    const handleToggleEstado = async (id, currentState) => {
        try {
            setUpdating(id);
            const token = localStorage.getItem("auth");

            await axios.patch(
                `https://sistemacontable-wico.onrender.com/api/usuario/${id}/`,
                { is_active: !currentState },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setUsuarios(usuarios.map(usuario =>
                usuario.id === id ? { ...usuario, is_active: !currentState } : usuario
            ));
        } catch (error) {
            console.error("Error al cambiar el estado del usuario", error);
            setError(error.response?.data?.detail || "Error al cambiar el estado del usuario");

            if (error.response?.status === 401) {
                localStorage.removeItem("auth");
                navigate("/login");
            }
        } finally {
            setUpdating(null);
        }
    };

    const canToggleUser = (targetUser) => {
        if (!currentUser || !targetUser) return false;

        const myRole = currentUser.rol?.nombre;
        const targetRole = targetUser.rol?.nombre;

        if (myRole === "SuperAdmin") return targetRole !== "SuperAdmin";
        if (myRole === "Admin") return ["user_Supervisado", "user_Supervisor", "user_User",""].includes(targetRole);
        return false;
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Lista de Trabajadores</h2>
                {(currentUser?.rol?.nombre === "Admin" || currentUser?.rol?.nombre === "SuperAdmin") && (
                    <button
                        onClick={handleInsertarTrabajador}
                        className="btn btn-primary"
                    >
                        Insertar Trabajador
                    </button>
                )}
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
                                <th>Estado</th>
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
                                        <span className={`badge ${usuario.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <button
                                                onClick={() => handleModificarTrabajador(usuario.id)}
                                                className="btn btn-sm btn-warning"
                                                disabled={updating === usuario.id}
                                            >
                                                Modificar
                                            </button>
                                            {canToggleUser(usuario) && (
                                                <button
                                                    onClick={() => handleToggleEstado(usuario.id, usuario.is_active)}
                                                    className={`btn btn-sm ${usuario.is_active ? 'btn-danger' : 'btn-success'}`}
                                                    disabled={updating === usuario.id}
                                                >
                                                    {updating === usuario.id ? (
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ) : usuario.is_active ? 'Desactivar' : 'Activar'}
                                                </button>
                                            )}
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

export default ListaTrabajadores;



import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarPagosCobros = () => {
  const navigate = useNavigate();
  const [cobros, setCobros] = useState([]);
  const [groupedCobros, setGroupedCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para el manejo de meses
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState("");

  // Lista de meses en orden cronológico con su índice numérico
  const listaMeses = [
    { id: "enero", nombre: "Enero", index: 0 },
    { id: "febrero", nombre: "Febrero", index: 1 },
    { id: "marzo", nombre: "Marzo", index: 2 },
    { id: "abril", nombre: "Abril", index: 3 },
    { id: "mayo", nombre: "Mayo", index: 4 },
    { id: "junio", nombre: "Junio", index: 5 },
    { id: "julio", nombre: "Julio", index: 6 },
    { id: "agosto", nombre: "Agosto", index: 7 },
    { id: "septiembre", nombre: "Septiembre", index: 8 },
    { id: "octubre", nombre: "Octubre", index: 9 },
    { id: "noviembre", nombre: "Noviembre", index: 10 },
    { id: "diciembre", nombre: "Diciembre", index: 11 }
  ];

  // Obtener el mes actual
  const obtenerMesActual = () => {
    const hoy = new Date();
    const mesIndex = hoy.getMonth();
    return listaMeses[mesIndex].id;
  };

  // Genera los meses disponibles basados en los datos de cobros
  const generarMesesDisponibles = (cobrosData) => {
    const mesesUnicos = [...new Set(cobrosData
      .filter(cobro => cobro.mes)
      .map(cobro => cobro.mes.toLowerCase()))];
    
    if (mesesUnicos.length === 0) {
      const mesActual = obtenerMesActual();
      return listaMeses.filter(mes => mes.id === mesActual);
    }
    
    const mesesFiltrados = listaMeses.filter(mes => 
      mesesUnicos.includes(mes.id.toLowerCase())
    );
    
    return mesesFiltrados.sort((a, b) => a.index - b.index);
  };

  // Verifica si un cobro pertenece al mes especificado
  const esDelMes = (cobro, mesId) => {
    if (!cobro?.mes || !mesId) return false;
    return cobro.mes.toLowerCase() === mesId.toLowerCase();
  };

  const processCobros = (cobrosData, mesId) => {
    const grouped = {};
    
    const cobrosMes = mesId ? 
      cobrosData.filter(cobro => esDelMes(cobro, mesId)) : 
      cobrosData;
    
    cobrosMes.forEach(cobro => {
      if (!cobro?.usuario_registra?.id || !cobro?.usuario_registra?.nombre) {
        return;
      }
      
      const usuarioId = cobro.usuario_registra.id;
      const usuarioNombre = cobro.usuario_registra.nombre;
      
      if (!grouped[usuarioNombre]) {
        grouped[usuarioNombre] = {
          id: usuarioId,
          nombre: usuarioNombre,
          totalUnidades: 0,
          totalCobrar: 0,
          esSupervisor: false,
          rol: "Trabajador",
          supervisados: [],
          cobros: []
        };
      }
      
      grouped[usuarioNombre].cobros.push(cobro);
      
      // Calcular unidades NETAS para este cobro (incluyendo bonif/sanciones)
      let unidadesNetas = 0;
      
      // Sumar unidades de contenido
      if (cobro.contenido?.length > 0) {
        unidadesNetas += cobro.contenido.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
      }
      
      if (cobro.contenido_open?.length > 0) {
        unidadesNetas += cobro.contenido_open.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
      }
      
      if (cobro.contenido_spr?.length > 0) {
        unidadesNetas += cobro.contenido_spr.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
      }
      
      if ((!cobro.contenido || cobro.contenido.length === 0) &&
          (!cobro.contenido_open || cobro.contenido_open.length === 0) &&
          (!cobro.contenido_spr || cobro.contenido_spr.length === 0)) {
        unidadesNetas += parseInt(cobro.unidades) || 0;
      }
      
      // Aplicar bonificación/sanción DIRECTAMENTE a este cobro
      unidadesNetas += parseFloat(cobro.bonificado) || 0;
      unidadesNetas -= parseFloat(cobro.sancionado) || 0;
      unidadesNetas = Math.max(0, unidadesNetas); // No permitir negativos
      
      grouped[usuarioNombre].totalUnidades += unidadesNetas;
      
      // Calcular pago según supervisión
      const multiplicador = cobro.usuario_supervisor?.id ? 0.2 : 0.4;
      grouped[usuarioNombre].totalCobrar += unidadesNetas * multiplicador;
      
      // Procesar supervisor si existe
      if (cobro.usuario_supervisor?.id) {
        const supervisorNombre = cobro.usuario_supervisor.nombre;
        const supervisorId = cobro.usuario_supervisor.id;
        
        if (!grouped[supervisorNombre]) {
          grouped[supervisorNombre] = {
            id: supervisorId,
            nombre: supervisorNombre,
            totalUnidades: 0,
            totalCobrar: 0,
            esSupervisor: true,
            rol: "Supervisor",
            supervisados: [],
            cobros: []
          };
        }
        
        grouped[supervisorNombre].esSupervisor = true;
        grouped[supervisorNombre].rol = "Supervisor";
        
        if (!grouped[supervisorNombre].supervisados.some(u => u.id === usuarioId)) {
          grouped[supervisorNombre].supervisados.push({
            id: usuarioId,
            nombre: usuarioNombre
          });
        }
        
        grouped[supervisorNombre].totalUnidades += unidadesNetas;
        grouped[supervisorNombre].totalCobrar += unidadesNetas * 0.2;
      }
    });
    
    setGroupedCobros(Object.values(grouped));
  };

  useEffect(() => {
    const fetchCobros = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        
        const response = await axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobro/", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && Array.isArray(response.data)) {
          setCobros(response.data);
          
          const mesesDisponibles = generarMesesDisponibles(response.data);
          setMesesDisponibles(mesesDisponibles);
          
          const mesActual = obtenerMesActual();
          const hayCobrosMesActual = response.data.some(
            cobro => cobro.mes && cobro.mes.toLowerCase() === mesActual.toLowerCase()
          );
          
          const mesAUsar = hayCobrosMesActual ? 
            mesActual : 
            (mesesDisponibles.length > 0 ? mesesDisponibles[0].id : mesActual);
          
          setMesSeleccionado(mesAUsar);
          processCobros(response.data, mesAUsar);
          
          toast.success("Cobros cargados correctamente");
        } else {
          throw new Error("Formato de datos inválido");
        }
      } catch (error) {
        console.error("Error al obtener los cobros", error);
        setError(error.message || "Error al cargar la lista de cobros");
        toast.error(error.message || "Error al cargar los cobros");
      } finally {
        setLoading(false);
      }
    };

    fetchCobros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMesChange = (e) => {
    const newMesId = e.target.value;
    setMesSeleccionado(newMesId);
    processCobros(cobros, newMesId);
  };

  const handleInsertarPagoCobros = () => {
    navigate("/gestPago/insertarPagoCobros");
  };

  const mesSeleccionadoNombre = listaMeses.find(m => m.id === mesSeleccionado)?.nombre || mesSeleccionado;
  
  const totales = groupedCobros.reduce(
    (acc, grupo) => {
      const esSupervisado = groupedCobros.some(
        other => other.supervisados.some(s => s.id === grupo.id)
      );

      if (!esSupervisado) {
        acc.totalUnidades += grupo.totalUnidades;
        acc.totalCobrar += grupo.totalCobrar;
      }

      return acc;
    },
    { totalUnidades: 0, totalCobrar: 0 }
  );

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Lista Pagos</h2>
          <h5 className="text-muted">Mes: {mesSeleccionadoNombre}</h5>
        </div>
        <button
          onClick={handleInsertarPagoCobros}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Insertar Pago'}
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="form-label fw-bold">Seleccionar Mes:</label>
            </div>
            <div className="col-md-6">
              <select 
                className="form-select" 
                value={mesSeleccionado}
                onChange={handleMesChange}
                disabled={loading || mesesDisponibles.length === 0}
              >
                {mesesDisponibles.length === 0 ? (
                  <option value="">No hay meses disponibles</option>
                ) : (
                  mesesDisponibles.map(mes => (
                    <option key={mes.id} value={mes.id}>
                      {mes.nombre}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="col-md-3 text-end">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => {
                  const mesActual = obtenerMesActual();
                  const hayCobrosMesActual = cobros.some(
                    cobro => cobro.mes && cobro.mes.toLowerCase() === mesActual.toLowerCase()
                  );
                  
                  if (hayCobrosMesActual) {
                    setMesSeleccionado(mesActual);
                    processCobros(cobros, mesActual);
                  } else {
                    toast.info(`No hay cobros registrados para el mes actual (${listaMeses.find(m => m.id === mesActual)?.nombre})`);
                  }
                }}
                disabled={loading}
              >
                Mes Actual
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-center">Cargando cobros...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Trabajador</th>
                <th>Rol</th>
                <th>Unidades Netas</th>
                <th>Total a Pagar ($)</th>
                <th>Supervisados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupedCobros.length > 0 ? (
                groupedCobros.map((grupo) => (
                  <tr key={grupo.id}>
                    <td>{grupo.id}</td>
                    <td>
                      {grupo.nombre || 'Sin nombre'}
                      {grupo.esSupervisor && <span className="badge bg-info ms-2">Supervisor</span>}
                    </td>
                    <td>{grupo.rol}</td>
                    <td>{grupo.totalUnidades}</td>
                    <td>${grupo.totalCobrar.toFixed(2)}</td>
                    <td>
                      {grupo.supervisados.length > 0 ? (
                        <div>
                          <span className="badge bg-secondary">
                            {grupo.supervisados.length} supervisados
                          </span>
                          <ul className="small mt-1 list-unstyled">
                            {grupo.supervisados.slice(0, 3).map(sup => (
                              <li key={sup.id}>{sup.nombre}</li>
                            ))}
                            {grupo.supervisados.length > 3 && <li>...</li>}
                          </ul>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <button 
                        onClick={() => navigate(`/gestPago/listarPagosCobrosDetallados/${grupo.id}?mes=${mesSeleccionado}`)}
                        className="btn btn-sm btn-info"
                        title="Ver detalles"
                      >
                        <i className="bi bi-eye-fill"></i> Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">No hay cobros registrados en este mes</td>
                </tr>
              )}
              {groupedCobros.length > 0 && (
                <tr className="table-secondary fw-bold">
                  <td colSpan="3">Totales:</td>
                  <td>{totales.totalUnidades}</td>
                  <td>${totales.totalCobrar.toFixed(2)}</td>
                  <td colSpan="2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListarPagosCobros;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Form, InputGroup, Modal } from 'react-bootstrap';
import { FaSearch, FaCalendarAlt, FaTrash } from 'react-icons/fa';

const ModificarPagoCliente = () => {
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState({
    total: 0,
    clientes: 0
  });
  const [filters, setFilters] = useState({
    nombre: '',
    fechaDesde: '',
    fechaHasta: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pagoToDelete, setPagoToDelete] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth");
        
        // Obtener clientes
        const clientesResponse = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/list_client/", 
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Obtener historial de pagos
        const pagosResponse = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/listar_historial_pago/", 
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Ordenar clientes alfabéticamente
        const clientesOrdenados = [...clientesResponse.data].sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
        
        setClientes(clientesOrdenados);
        setPagos(pagosResponse.data);
        
        // Calcular totales
        const totalPagado = pagosResponse.data.reduce((sum, pago) => sum + pago.monto, 0);
        setTotals({
          total: totalPagado,
          clientes: clientesResponse.data.length
        });
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para eliminar un pago
  const handleDeletePago = async () => {
    try {
      const token = localStorage.getItem("auth");
      await axios.delete(
        `https://sistemacontable-wico.onrender.com/api/eliminar_historial_pago/${pagoToDelete}/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Actualizar la lista de pagos
      const updatedPagos = pagos.filter(pago => pago.id !== pagoToDelete);
      setPagos(updatedPagos);
      
      // Recalcular totales
      const totalPagado = updatedPagos.reduce((sum, pago) => sum + pago.monto, 0);
      setTotals(prev => ({
        ...prev,
        total: totalPagado
      }));
      
      setShowDeleteModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Función para confirmar eliminación
  const confirmDelete = (pagoId) => {
    setPagoToDelete(pagoId);
    setShowDeleteModal(true);
  };

  // Agrupar y filtrar pagos por cliente
  const getPagosFiltrados = () => {
    const pagosPorCliente = {};
    
    // Primero filtramos los pagos según los criterios
    const pagosFiltrados = pagos.filter(pago => {
      const fechaPago = new Date(pago.fecha);
      const desde = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
      const hasta = filters.fechaHasta ? new Date(filters.fechaHasta) : null;
      
      const cumpleFecha = (
        (!desde || fechaPago >= desde) && 
        (!hasta || fechaPago <= hasta)
      );
      
      const cliente = clientes.find(c => c.id === pago.cliente_id);
      const nombreCliente = cliente ? cliente.nombre.toLowerCase() : '';
      const cumpleNombre = nombreCliente.includes(filters.nombre.toLowerCase());
      
      return cumpleFecha && cumpleNombre;
    });
    
    // Luego agrupamos
    pagosFiltrados.forEach(pago => {
      if (!pagosPorCliente[pago.cliente_id]) {
        pagosPorCliente[pago.cliente_id] = [];
      }
      pagosPorCliente[pago.cliente_id].push(pago);
    });
    
    return pagosPorCliente;
  };

  // Función para alternar la expansión de filas
  const toggleRow = (clienteId) => {
    const newExpandedRows = [...expandedRows];
    const index = newExpandedRows.indexOf(clienteId);
    
    if (index === -1) {
      newExpandedRows.push(clienteId);
    } else {
      newExpandedRows.splice(index, 1);
    }
    
    setExpandedRows(newExpandedRows);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      nombre: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  if (loading) return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container-fluid mt-3">
      <div className="alert alert-danger" role="alert">
        Error al cargar el historial: {error}
      </div>
    </div>
  );

  const pagosPorCliente = getPagosFiltrados();
  const clientesConPagos = clientes.filter(cliente => 
    pagosPorCliente[cliente.id]?.length > 0 || filters.nombre === ''
  );

  return (
    <div className="container-fluid mt-3">
      {/* Modal de confirmación para eliminar */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro que deseas eliminar este pago? Esta acción no se puede deshacer.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeletePago}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h3 className="m-0">Historial de Pagos</h3>
          <div>
            <span className="badge bg-info me-2">Clientes: {clientesConPagos.length}</span>
            <span className="badge bg-success">
              Total Pagado: ${Object.values(pagosPorCliente).reduce((sum, pagos) => 
                sum + pagos.reduce((sumPago, pago) => sumPago + pago.monto, 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="card-body border-bottom">
          <div className="row g-3">
            <div className="col-md-4">
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  name="nombre"
                  placeholder="Filtrar por nombre"
                  value={filters.nombre}
                  onChange={handleFilterChange}
                />
              </InputGroup>
            </div>
            
            <div className="col-md-3">
              <InputGroup>
                <InputGroup.Text>
                  <FaCalendarAlt />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  name="fechaDesde"
                  placeholder="Desde"
                  value={filters.fechaDesde}
                  onChange={handleFilterChange}
                />
              </InputGroup>
            </div>
            
            <div className="col-md-3">
              <InputGroup>
                <InputGroup.Text>
                  <FaCalendarAlt />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  name="fechaHasta"
                  placeholder="Hasta"
                  value={filters.fechaHasta}
                  onChange={handleFilterChange}
                  min={filters.fechaDesde}
                />
              </InputGroup>
            </div>
            
            <div className="col-md-2">
              <Button 
                variant="outline-secondary" 
                onClick={resetFilters}
                className="w-100"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table bordered hover className="mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th className="text-end">Total Pagado</th>
                  <th className="text-end">Último Pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesConPagos.map((cliente, index) => {
                  const clientePagos = pagosPorCliente[cliente.id] || [];
                  const montoTotal = clientePagos.reduce((sum, pago) => sum + pago.monto, 0);
                  const ultimoPago = clientePagos.length > 0 
                    ? new Date(Math.max(...clientePagos.map(p => new Date(p.fecha))))
                    : null;
                  const tienePagos = clientePagos.length > 0;
                  const estado = tienePagos ? 'Con pagos' : 'Sin pagos';
                  
                  // Si hay filtro de nombre y no coincide, no mostrar
                  if (filters.nombre && !cliente.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) {
                    return null;
                  }
                  
                  return (
                    <React.Fragment key={cliente.id}>
                      <tr 
                        className={`fw-bold ${tienePagos ? 'table-primary' : 'table-secondary'}`} 
                        onClick={() => toggleRow(cliente.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-center">{index + 1}</td>
                        <td>{cliente.nombre}</td>
                        <td className="text-end">${montoTotal.toFixed(2)}</td>
                        <td className="text-end">
                          {ultimoPago 
                            ? ultimoPago.toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${tienePagos ? 'bg-success' : 'bg-secondary'}`}>
                            {estado}
                          </span>
                        </td>
                         <td></td> 
                      </tr>
                      
                      {expandedRows.includes(cliente.id) && clientePagos.map((pago, pagoIndex) => (
                        <tr key={pago.id} className="table-info">
                          <td className="text-end">{index + 1}.{pagoIndex + 1}</td>
                          <td colSpan="1">
                            <small className="text-muted">Pago registrado</small>
                          </td>
                          <td className="text-end">${pago.monto.toFixed(2)}</td>
                          <td className="text-end">{new Date(pago.fecha).toLocaleDateString()}</td>
                          <td className="text-center">
                            <span className="badge bg-info">Registrado</span>
                          </td>
                           <td className="text-center"> 
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(pago.id);
                              }}
                              title="Eliminar este pago"
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                
                {clientesConPagos.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      {filters.nombre || filters.fechaDesde || filters.fechaHasta 
                        ? "No se encontraron resultados con los filtros aplicados"
                        : "No hay datos de pagos registrados"}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
        <div className="card-footer bg-light">
          <div className="row align-items-center">
            <div className="col-md-4">
              <span className="badge bg-primary me-2">Cliente</span>
              <span className="badge bg-info">Detalle pago</span>
            </div>
            <div className="col-md-8 text-md-end">
              <strong className="text-success">
                Total Pagado: ${Object.values(pagosPorCliente).reduce((sum, pagos) => 
                  sum + pagos.reduce((sumPago, pago) => sumPago + pago.monto, 0), 0).toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModificarPagoCliente;
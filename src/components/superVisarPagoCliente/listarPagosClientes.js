import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Modal, Button, Table, Form, InputGroup } from 'react-bootstrap';

const PagosClientesSuperAdmin = () => {
  const [data, setData] = useState({
    cobrosEstimados: [],
    tareas: [],
    documentos: [],
    montosExtra: [],
    fondos: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClientes, setExpandedClientes] = useState({});
  const [expandedDocumentos, setExpandedDocumentos] = useState({});
  const [pagoData, setPagoData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    clienteId: null
  });
  const [modalData, setModalData] = useState({
    show: false,
    contenido: [],
    tipo: '',
    title: ''
  });
  const [filters, setFilters] = useState({
    estado: 'todos',
    nombreCliente: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("auth");
      try {
        const responses = await Promise.all([
          axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobros_estimados/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://sistemacontable-wico.onrender.com/api/listar_tarea/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://sistemacontable-wico.onrender.com/api/listar_documentacion/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://sistemacontable-wico.onrender.com/api/listar_monto_extra/', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('https://sistemacontable-wico.onrender.com/api/historial_fondo/', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setData({
          cobrosEstimados: responses[0].data,
          tareas: responses[1].data,
          documentos: responses[2].data,
          montosExtra: responses[3].data,
          fondos: responses[4].data
        });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const TIPOS_TAREA = {
    1: 'Notas',
    2: 'Subir Notas',
    3: 'Bill',
    4: 'Open',
    5: 'SPR'
  };

  const getTipoTarea = (tipo) => TIPOS_TAREA[tipo] || 'Desconocido';

  const toggleCliente = (clienteId) => {
    setExpandedClientes(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  const toggleDocumento = (docId) => {
    setExpandedDocumentos(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const handlePagoChange = (e) => {
    const { name, value } = e.target;
    setPagoData(prev => ({
      ...prev,
      [name]: name === 'clienteId' ? (value ? parseInt(value) : null) : value
    }));
  };

  const mostrarDetalle = (contenido, tipo) => {
    setModalData({
      show: true,
      contenido,
      tipo,
      title: `Detalle de ${getTipoTarea(tipo)}`
    });
  };

  const getTotalEstimadoConAjustes = (cobroEstimadoId) => {
    const cobro = data.cobrosEstimados.find(ce => ce.id === cobroEstimadoId);
    if (!cobro) return 0;
    
    const totalBase = (cobro.bill || 0) + (cobro.notas || 0) + (cobro.subir_notas || 0) + (cobro.open || 0) + (cobro.spr || 0);
    
    const tareasCobro = data.tareas.filter(t => t.cobro?.id === cobroEstimadoId);
    const ajusteTotal = tareasCobro.reduce((sum, tarea) => {
      return sum + (tarea.cobro?.suma || 0) - (tarea.cobro?.restar || 0);
    }, 0);
    
    return totalBase + ajusteTotal;
  };

  const getTareasPorCobro = (cobroEstimadoId) => {
    return data.tareas
      .filter(t => t.cobro?.id === cobroEstimadoId)
      .map(t => ({
        ...t,
        tipo_tarea: t.tipo_tarea || t.cobro?.tarea
      }));
  };

  const procesarDatos = () => {
    const clientesMap = new Map();

    // Procesar montos extra por cliente (pagos realizados)
    const montosExtraPorCliente = data.montosExtra.reduce((acc, me) => {
      if (!acc[me.cliente]) acc[me.cliente] = 0;
      acc[me.cliente] += me.monto;
      return acc;
    }, {});

    // Procesar documentos y clientes
    data.documentos.forEach(doc => {
      if (!doc?.cliente) return;
      const clienteId = doc.cliente.id_cliente || doc.cliente.id;
      if (!clienteId) return;

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          id: clienteId,
          nombre: doc.cliente.nombre_cliente || doc.cliente.nombre || 'Cliente sin nombre',
          agencias: doc.cliente.agencias || [],
          documentos: new Map(),
          totalEstimado: 0,
          totalPagado: montosExtraPorCliente[clienteId] || 0,
          estado: 'Pendiente'
        });
      }
    });

    // Procesar cobros estimados
    data.cobrosEstimados.forEach(estimado => {
      if (!estimado.documento || !estimado.documento.id) return;
      
      const documentoCompleto = data.documentos.find(d => d.id === estimado.documento.id);
      if (!documentoCompleto || !documentoCompleto.cliente) return;
      
      const clienteId = documentoCompleto.cliente.id_cliente || documentoCompleto.cliente.id;
      const cliente = clientesMap.get(clienteId);
      if (!cliente) return;
      
      const docId = estimado.documento.id;
      
      if (!cliente.documentos.has(docId)) {
        const tareasAjustes = getTareasPorCobro(estimado.id);
        const totalEstimado = getTotalEstimadoConAjustes(estimado.id);
        
        cliente.documentos.set(docId, {
          id: docId,
          nombre: estimado.documento.nombre || documentoCompleto.nombre_archivo || 'Documento sin nombre',
          tareasAjustes: tareasAjustes,
          cobroEstimado: estimado,
          totalEstimado: totalEstimado,
          pagado: 0,
          estado: 'Pendiente'
        });
        
        cliente.totalEstimado += totalEstimado;
      }
    });

    // Calcular saldos y estados
    clientesMap.forEach(cliente => {
      let saldoTotal = cliente.totalEstimado - cliente.totalPagado;
      
      // Actualizar estado del cliente
      cliente.estado = saldoTotal > 0 ? 'Pendiente' : 'Pagado';
      cliente.saldo = saldoTotal;
      
      // Actualizar documentos del cliente
      cliente.documentos.forEach(documento => {
        // Asignamos el pago proporcional al documento
        const proporcion = documento.totalEstimado / cliente.totalEstimado;
        documento.pagado = cliente.totalPagado * proporcion;
        
        // Calcular saldo del documento
        documento.saldo = documento.totalEstimado - documento.pagado;
        
        // Actualizar estado del documento
        documento.estado = documento.saldo > 0 ? 'Pendiente' : 'Pagado';
      });
    });
    
    // Convertir a array y aplicar filtros
    const clientesArray = Array.from(clientesMap.values()).map(cliente => ({
      ...cliente,
      documentos: Array.from(cliente.documentos.values()).sort((a, b) => 
        (a.nombre || '').localeCompare(b.nombre || '')
      )
    })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    
    // Aplicar filtros solo si hay valores en los filtros
    return clientesArray.filter(cliente => {
      // Filtro por nombre (si hay texto en el filtro)
      const nombreMatch = filters.nombreCliente === '' || 
        cliente.nombre.toLowerCase().includes(filters.nombreCliente.toLowerCase());
      
      // Filtro por estado (si no es 'todos')
      const estadoMatch = filters.estado === 'todos' || 
        cliente.estado === filters.estado;
      
      return nombreMatch && estadoMatch;
    });
  };

  const { clientesProcesados, clientesUnicos, totals } = useMemo(() => {
    if (loading || error) return { clientesProcesados: [], clientesUnicos: [], totals: {} };

    const clientesProcesados = procesarDatos();

    const totals = {
      estimado: clientesProcesados.reduce((sum, c) => sum + c.totalEstimado, 0),
      saldo: clientesProcesados.reduce((sum, c) => sum + c.saldo, 0),
      pagado: clientesProcesados.reduce((sum, c) => sum + c.totalPagado, 0)
    };

    const clientesUnicos = clientesProcesados.map(c => ({
      id: c.id,
      nombre: c.nombre,
      fondo: c.fondo || 0,
      fecha_fondo: c.fecha_fondo || null,
      agencias: c.agencias || []
    }));

    return { clientesProcesados, clientesUnicos, totals };
  }, [data, loading, error, filters]);

  const registrarPago = async () => {
    const { clienteId, monto, fecha } = pagoData;
    if (!clienteId || !monto || parseFloat(monto) <= 0 || !fecha) return;
    
    const token = localStorage.getItem("auth");
    try {
      // Registrar el pago como monto extra
      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/monto_extra/${clienteId}`,
        {
          monto: parseFloat(monto),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.post(
        'https://sistemacontable-wico.onrender.com/api/historial_pago/',
        {
          cliente: clienteId,
          monto: parseFloat(monto),
          fecha_pago: fecha
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Actualizar datos
      const [montosExtraResponse, fondosResponse] = await Promise.all([
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_monto_extra/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/historial_fondo/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setData(prev => ({ 
        ...prev, 
        montosExtra: montosExtraResponse.data,
        fondos: fondosResponse.data
      }));

      setPagoData({
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        clienteId: null
      });

      alert("Pago registrado correctamente");
    } catch (err) {
      console.error("Error al aplicar pago:", err);
      alert("No se pudo aplicar el pago: " + (err.response?.data?.message || err.message));
    }
  };

  const resetFilters = () => {
    setFilters({
      estado: 'todos',
      nombreCliente: ''
    });
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="alert alert-danger mt-3">
      Error al cargar los datos: {error}
    </div>
  );

  return (
    <div className="container-fluid mt-3">
      <Modal show={modalData.show} onHide={() => setModalData(prev => ({ ...prev, show: false }))} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modalData.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre Completo</th>
                {!['Open', 'SPR'].includes(modalData.tipo) && <th>Unidades</th>}
                {['Open', 'SPR'].includes(modalData.tipo) && <th>Detalle</th>}
              </tr>
            </thead>
            <tbody>
              {modalData.contenido.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.nombre_completo || 'Sin nombre'}</td>
                  {!['Open', 'SPR'].includes(modalData.tipo) && <td>{item.unidades || 0}</td>}
                  {['Open', 'SPR'].includes(modalData.tipo) && (
                    <td>
                      <pre className="mb-0" style={{whiteSpace: 'pre-wrap'}}>
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalData(prev => ({ ...prev, show: false }))}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="card mb-3 shadow">
        <div className="card-header bg-primary text-white">
          <h4>Registrar Pago</h4>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <Form.Label>Cliente</Form.Label>
              <Form.Select
                name="clienteId"
                value={pagoData.clienteId || ''}
                onChange={handlePagoChange}
              >
                <option value="">Seleccionar cliente</option>
                {clientesUnicos.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} 
                    {cliente.fondo > 0 && ` (Fondo: $${cliente.fondo.toFixed(2)})`}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Label>Monto del pago</Form.Label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <Form.Control
                  type="number"
                  name="monto"
                  value={pagoData.monto}
                  onChange={handlePagoChange}
                  placeholder="Ingrese el monto"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="col-md-3">
              <Form.Label>Fecha del pago</Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={pagoData.fecha}
                onChange={handlePagoChange}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <Button
                variant="success"
                className="w-100"
                onClick={registrarPago}
                disabled={!pagoData.clienteId || !pagoData.monto || parseFloat(pagoData.monto) <= 0 || !pagoData.fecha}
              >
                Registrar Pago
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h3 className="m-0">Pagos de Clientes</h3>
          <div>
            <span className="badge bg-info me-2">Clientes: {clientesProcesados.length}</span>
            <span className="badge bg-warning me-2">A Cobrar: ${totals.estimado.toFixed(2)}</span>
            <span className={`badge ${totals.saldo > 0 ? 'bg-danger' : 'bg-success'}`}>
              {totals.saldo < 0 ? 'Fondo' : 'Deuda'}: ${Math.abs(totals.saldo).toFixed(2)}
            </span>
            <span className="badge bg-success">Pagado: ${totals.pagado.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Sección de Filtros */}
        <div className="card-body p-3 bg-light">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar por nombre de cliente..."
                  value={filters.nombreCliente}
                  onChange={(e) => setFilters({...filters, nombreCliente: e.target.value})}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <InputGroup>
                <InputGroup.Text>Estado</InputGroup.Text>
                <Form.Select
                  value={filters.estado}
                  onChange={(e) => setFilters({...filters, estado: e.target.value})}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="Pendiente">Solo pendientes</option>
                  <option value="Pagado">Solo pagados</option>
                </Form.Select>
              </InputGroup>
            </div>
            <div className="col-md-3">
              <Button 
                variant="outline-secondary" 
                onClick={resetFilters}
                disabled={filters.estado === 'todos' && filters.nombreCliente === ''}
              >
                Limpiar Filtros
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
                  <th className="text-end">A Cobrar</th>
                  <th>Estado</th>
                  <th className="text-end">{totals.saldo < 0 ? 'Fondo' : 'Deuda'}</th>
                  <th className="text-end">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {clientesProcesados.length > 0 ? (
                  clientesProcesados.map((cliente, idxCliente) => (
                    <React.Fragment key={`cliente-${cliente.id}`}>
                      <tr 
                        className={`table-primary fw-bold ${cliente.estado === 'Pendiente' ? 'table-warning' : 'table-success'}`} 
                        onClick={() => toggleCliente(cliente.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-center">{idxCliente + 1}</td>
                        <td>{cliente.nombre}</td>
                        <td className="text-end">Total: ${cliente.totalEstimado.toFixed(2)}</td>
                        <td className="text-center">
                          <span className={`badge ${cliente.estado === 'Pendiente' ? 'bg-warning' : 'bg-success'}`}>
                            {cliente.estado}
                          </span>
                        </td>
                        <td className={`text-end ${cliente.saldo > 0 ? 'text-danger' : 'text-success'} fw-bold`}>
                          ${Math.abs(cliente.saldo).toFixed(2)}
                        </td>
                        <td className="text-end text-success fw-bold">${cliente.totalPagado.toFixed(2)}</td>
                      </tr>
                      
                      {expandedClientes[cliente.id] && cliente.documentos.map((documento, idxDoc) => (
                        <React.Fragment key={`doc-${documento.id}`}>
                          <tr 
                            className={`table-info ${documento.estado === 'Pendiente' ? 'table-warning' : 'table-success'}`} 
                            onClick={() => toggleDocumento(documento.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="text-end">{idxCliente + 1}.{idxDoc + 1}</td>
                            <td>{documento.nombre}</td>
                            <td className="text-end">${documento.totalEstimado.toFixed(2)}</td>
                            <td className="text-center">
                              <span className={`badge ${documento.estado === 'Pendiente' ? 'bg-warning' : 'bg-success'}`}>
                                {documento.estado}
                              </span>
                            </td>
                            <td className={`text-end ${documento.saldo > 0 ? 'text-danger' : 'text-success'}`}>
                              ${Math.abs(documento.saldo).toFixed(2)}
                            </td>
                            <td className="text-end text-success">${documento.pagado.toFixed(2)}</td>
                          </tr>
                          
                          {expandedDocumentos[documento.id] && documento.tareasAjustes.map((ajuste) => {
                            const esSuma = ajuste.cobro?.suma > 0;
                            const unidades = esSuma ? ajuste.cobro.suma : ajuste.cobro.restar;
                            
                            return (
                              <tr key={`ajuste-${ajuste.id}`} className={esSuma ? 'table-success' : 'table-danger'}>
                                <td colSpan="2" className="text-end small">
                                  {getTipoTarea(ajuste.tipo_tarea || ajuste.cobro?.tarea)} ({esSuma ? 'Suma' : 'Resta'})
                                </td>
                                <td className="text-end">
                                  {esSuma ? '+' : '-'}${unidades.toFixed(2)}
                                </td>
                                <td colSpan="3"></td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      {filters.estado !== 'todos' || filters.nombreCliente !== '' ? (
                        <>
                          <i className="bi bi-exclamation-circle fs-1 text-muted"></i>
                          <p className="mt-2">No se encontraron clientes con los filtros aplicados</p>
                          <Button variant="outline-primary" size="sm" onClick={resetFilters}>
                            Limpiar filtros
                          </Button>
                        </>
                      ) : (
                        <p>No hay datos de clientes disponibles</p>
                      )}
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
              <span className="badge bg-info me-2">Documento</span>
              <span className="badge bg-light text-dark border">Ajuste</span>
            </div>
            <div className="col-md-8 text-md-end">
              <strong className="me-3">Total Cobrar: ${totals.estimado.toFixed(2)}</strong>
              <strong className={`me-3 ${totals.saldo > 0 ? 'text-danger' : 'text-success'}`}>
                {totals.saldo < 0 ? 'Fondo' : 'Deuda'}: ${Math.abs(totals.saldo).toFixed(2)}
              </strong>
              <strong className="text-success">Pagado: ${totals.pagado.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosClientesSuperAdmin;
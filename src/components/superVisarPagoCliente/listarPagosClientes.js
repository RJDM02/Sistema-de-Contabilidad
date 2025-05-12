import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Modal, Button, Table, Form } from 'react-bootstrap';

const PagosClientesSuperAdmin = () => {
  const [data, setData] = useState({
    cobrosEstimados: [],
    cobrosReales: [],
    tareas: [],
    documentos: []
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("auth");
      try {
        const endpoints = [
          'listar_cobros_estimados',
          'listar_cobro',
          'listar_tarea',
          'listar_documentacion'
        ];
        
        const responses = await Promise.all(
          endpoints.map(endpoint => 
            axios.get(`https://sistemacontable-wico.onrender.com/api/${endpoint}/`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );

        setData({
          cobrosEstimados: responses[0].data,
          cobrosReales: responses[1].data,
          tareas: responses[2].data,
          documentos: responses[3].data
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

  const getValorEstimadoPorTipo = (documento, tipoTarea) => {
    if (!documento.cobroEstimado) return 0;
    
    let valorBase = 0;
    switch(tipoTarea) {
      case 1: valorBase = documento.cobroEstimado.notas || 0; break;
      case 2: valorBase = documento.cobroEstimado.subir_notas || 0; break;
      case 3: valorBase = documento.cobroEstimado.bill || 0; break;
      case 4: valorBase = documento.cobroEstimado.open || 0; break;
      case 5: valorBase = documento.cobroEstimado.spr || 0; break;
      default: return 0;
    }
    
    // Aplicar ajustes para este tipo de tarea
    const ajustes = documento.tareasAjustes.filter(t => 
      (t.tipo_tarea || t.cobro?.tarea) === tipoTarea
    );
    
    const totalAjustes = ajustes.reduce((sum, t) => sum + (t.cobro?.suma || 0) - (t.cobro?.restar || 0), 0);
    
    return valorBase + totalAjustes;
  };

  const renderContenidoDetalle = (contenido, tipoTarea) => {
    if (!contenido || contenido.length === 0) return null;

    return (
      <Button 
        variant="link" 
        size="sm" 
        onClick={() => mostrarDetalle(contenido, tipoTarea)}
        className="p-0"
      >
        Ver {['Open', 'SPR'].includes(getTipoTarea(tipoTarea)) ? getTipoTarea(tipoTarea) : 'detalle'} ({contenido.length})
      </Button>
    );
  };

  const procesarDatos = () => {
  const clientesMap = new Map();

  // Procesar documentos y clientes (igual que antes)
  data.documentos.forEach(doc => {
    if (!doc?.cliente) return;
    const clienteId = doc.cliente.id_cliente || doc.cliente.id;
    if (!clientesMap.has(clienteId)) {
      clientesMap.set(clienteId, {
        id: clienteId,
        nombre: doc.cliente.nombre_cliente || doc.cliente.nombre || 'Cliente sin nombre',
        documentos: new Map(),
        totalEstimado: 0,
        totalReal: 0,
        pagado: 0,
        fondo: doc.cliente.fondo || 0,
        fecha_fondo: doc.cliente.fecha_fondo || null
      });
    }
  });

  // Procesar cobros estimados (calcular totalEstimado)
  data.cobrosEstimados.forEach(estimado => {
    if (!estimado.documento) return;
    const docCompleto = data.documentos.find(d => d.id === estimado.documento.id);
    if (!docCompleto?.cliente) return;

    const clienteId = docCompleto.cliente.id_cliente || docCompleto.cliente.id;
    const cliente = clientesMap.get(clienteId);
    if (!cliente) return;

    const docId = estimado.documento.id;
    if (!cliente.documentos.has(docId)) {
      const tareasAjustes = getTareasPorCobro(estimado.id);
      const totalEstimado = getTotalEstimadoConAjustes(estimado.id);

      cliente.documentos.set(docId, {
        id: docId,
        nombre: estimado.documento.nombre || 'Documento sin nombre',
        tareasAjustes,
        cobroEstimado: estimado,
        totalEstimado,
        pagado: 0
      });

      cliente.totalEstimado += totalEstimado; // Sumar al total del cliente
    }
  });

  // Procesar cobros reales (solo para calcular lo pagado)
  data.cobrosReales.forEach(cobro => {
    if (!cobro.documento) return;
    const docCompleto = data.documentos.find(d => d.id === cobro.documento.id);
    if (!docCompleto?.cliente) return;

    const clienteId = docCompleto.cliente.id_cliente || docCompleto.cliente.id;
    const cliente = clientesMap.get(clienteId);
    if (!cliente) return;

    const docId = cobro.documento.id;
    const documento = cliente.documentos.get(docId) || {
      id: docId,
      nombre: cobro.documento.nombre || 'Documento sin nombre',
      tareasAjustes: [],
      cobroEstimado: null,
      totalEstimado: 0,
      pagado: 0
    };

    if (cobro.pagado) {
      const monto = cobro.unidades * 1; // Asumiendo $1 por unidad
      documento.pagado += monto;
      cliente.pagado += monto;
    }

    cliente.documentos.set(docId, documento);
  });

  // Calcular deuda basada en estimados - pagado
  clientesMap.forEach(cliente => {
    cliente.deuda = Math.max(0, cliente.totalEstimado - cliente.pagado);
    cliente.deudaConFondo = Math.max(0, cliente.deuda - (cliente.fondo || 0));
  });

  // Convertir a array y ordenar
  return Array.from(clientesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
};

  const { clientesProcesados, clientesUnicos, totals } = useMemo(() => {
    if (loading || error) return { clientesProcesados: [], clientesUnicos: [], totals: {} };

    const clientesProcesados = procesarDatos();

    const totals = {
      deuda: clientesProcesados.reduce((sum, c) => sum + c.deuda, 0),
      pagado: clientesProcesados.reduce((sum, c) => sum + c.pagado, 0),
      estimado: clientesProcesados.reduce((sum, c) => sum + c.totalEstimado, 0),
      real: clientesProcesados.reduce((sum, c) => sum + c.totalReal, 0),
      deudaConFondo: clientesProcesados.reduce((sum, c) => sum + c.deudaConFondo, 0),
      fondos: clientesProcesados.reduce((sum, c) => sum + (c.fondo || 0), 0)
    };

    const clientesUnicos = clientesProcesados.map(c => ({
      id: c.id,
      nombre: c.nombre,
      fondo: c.fondo || 0,
      fecha_fondo: c.fecha_fondo || null,
      agencias: c.agencias || []
    }));

    return { clientesProcesados, clientesUnicos, totals };
  }, [data, loading, error]);

  const aplicarPagoConFondo = async () => {
    const { clienteId, monto, fecha } = pagoData;
    if (!clienteId || !monto || parseFloat(monto) <= 0 || !fecha) return;
    
    const token = localStorage.getItem("auth");
    try {
      const cobrosPendientes = data.cobrosReales
        .filter(cr => cr.cliente?.id === clienteId && !cr.pagado)
        .sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
      
      if (cobrosPendientes.length === 0) {
        alert("El cliente no tiene cobros pendientes");
        return;
      }

      const cliente = cobrosPendientes[0].cliente;
      const fondoActual = cliente.fondo || 0;
      const montoTotal = parseFloat(monto) + fondoActual;
      let saldoDisponible = montoTotal;
      const serviciosAPagar = [];

      for (const cobro of cobrosPendientes) {
        if (saldoDisponible <= 0) break;
        
        const unidades = [...(cobro.contenido || []), ...(cobro.contenido_open || []), ...(cobro.contenido_spr || [])]
                        .reduce((sum, item) => sum + (item.unidades || 0), cobro.unidades || 0);
        const montoServicio = unidades * 1;
        
        if (saldoDisponible >= montoServicio) {
          serviciosAPagar.push(cobro.id);
          saldoDisponible -= montoServicio;
        }
      }

      await Promise.all(
        serviciosAPagar.map(id =>
          axios.put(
            `https://sistemacontable-wico.onrender.com/api/modificar_estado_cobro/${id}/`,
            { pagado: true },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/actualizar_fondo/${clienteId}/`,
        { 
          fondo: saldoDisponible > 0 ? saldoDisponible : 0,
          fecha_fondo: saldoDisponible > 0 ? fecha : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const todosPagados = !data.cobrosReales.some(
        cr => cr.cliente?.id === clienteId && !cr.pagado
      );

      if (todosPagados && saldoDisponible > 0) {
        await axios.put(
          `https://sistemacontable-wico.onrender.com/api/limpiar_fondo/${clienteId}/`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setLoading(true);
      const response = await axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobro/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(prev => ({ ...prev, cobrosReales: response.data }));
      setLoading(false);
      
      setPagoData({
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        clienteId: null
      });
      
      alert(`Pago aplicado correctamente. ${
        saldoDisponible > 0 ? `Fondo residual: $${saldoDisponible.toFixed(2)}` : 'Todos los servicios pagados'
      }`);
    } catch (err) {
      console.error("Error al aplicar pago:", err);
      alert("No se pudo aplicar el pago: " + (err.response?.data?.message || err.message));
    }
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
                    {cliente.nombre} {cliente.fondo > 0 ? `(Fondo: $${cliente.fondo.toFixed(2)})` : ''}
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
                onClick={aplicarPagoConFondo}
                disabled={!pagoData.clienteId || !pagoData.monto || parseFloat(pagoData.monto) <= 0 || !pagoData.fecha}
              >
                Aplicar Pago
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
            <span className="badge bg-warning me-2">Estimado: ${totals.estimado.toFixed(2)}</span>
            <span className="badge bg-primary me-2">Real: ${totals.real.toFixed(2)}</span>
            <span className="badge bg-danger me-2">
              Deuda: ${totals.deudaConFondo.toFixed(2)} (${totals.deuda.toFixed(2)})
            </span>
            <span className="badge bg-success">Pagado: ${totals.pagado.toFixed(2)}</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table bordered hover className="mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th></th>
                  <th></th>
                  <th className="text-end">Unidades</th>
                  <th className="text-end">Estimado</th>
                  <th className="text-end">Real</th>
                  <th>Estado</th>
                  <th className="text-end text-danger">Deuda</th>
                  <th className="text-end text-success">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {clientesProcesados.map((cliente, idxCliente) => (
                  <React.Fragment key={`cliente-${cliente.id}`}>
                    <tr 
                      className="table-primary fw-bold" 
                      onClick={() => toggleCliente(cliente.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">{idxCliente + 1}</td>
                      <td colSpan="3">{cliente.nombre}</td>
                      <td className="text-end">Total cliente:</td>
                      <td className="text-end">${cliente.totalEstimado.toFixed(2)}</td>
                      <td className="text-end">${cliente.totalReal.toFixed(2)}</td>
                      <td></td>
                      <td className="text-end text-danger fw-bold">
                        ${cliente.deudaConFondo.toFixed(2)} (${cliente.deuda.toFixed(2)})
                        {cliente.fondo > 0 && <div className="small">Fondo: ${cliente.fondo.toFixed(2)}</div>}
                      </td>
                      <td className="text-end text-success fw-bold">${cliente.pagado.toFixed(2)}</td>
                    </tr>
                    
                    {expandedClientes[cliente.id] && cliente.documentos.map((documento, idxDoc) => (
                      <React.Fragment key={`doc-${documento.id}`}>
                        <tr 
                          className="table-info" 
                          onClick={() => toggleDocumento(documento.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="text-end">{idxCliente + 1}.{idxDoc + 1}</td>
                          <td colSpan="3">{documento.nombre}</td>
                          <td className="text-end">Total documento:</td>
                          <td className="text-end">${documento.totalEstimado.toFixed(2)}</td>
                          <td className="text-end">${documento.totalReal.toFixed(2)}</td>
                          <td></td>
                          <td className="text-end text-danger">${documento.deuda.toFixed(2)}</td>
                          <td className="text-end text-success">${documento.pagado.toFixed(2)}</td>
                        </tr>
                        
                        {expandedDocumentos[documento.id] && documento.tareasReales.map((tarea) => {
                          const valorEstimado = getValorEstimadoPorTipo(documento, tarea.tipo_tarea);
                          const hayDiscrepancia = Math.abs(tarea.monto - valorEstimado) > 0.01;

                          return (
                            <React.Fragment key={`real-${tarea.id}`}>
                              <tr className={tarea.pagado ? 'table-light' : 'table-warning'}>
                                <td colSpan="3"></td>
                                <td>
                                  {tarea.tipo_nombre} - {tarea.mes}
                                  {tarea.tieneContenido && renderContenidoDetalle(tarea.contenido, tarea.tipo_tarea)}
                                </td>
                                <td className="text-end">{tarea.unidades}</td>
                                <td className={`text-end ${hayDiscrepancia ? 'text-danger fw-bold' : ''}`}>
                                  ${valorEstimado.toFixed(2)}
                                  {documento.tareasAjustes.filter(t => 
                                    (t.tipo_tarea || t.cobro?.tarea) === tarea.tipo_tarea
                                  ).length > 0 && (
                                    <div className="small text-muted">
                                      (Base: ${documento.valoresBase[getTipoTarea(tarea.tipo_tarea).toLowerCase().replace(' ', '_')].toFixed(2)})
                                    </div>
                                  )}
                                </td>
                                <td className={`text-end ${hayDiscrepancia ? 'text-danger fw-bold' : ''}`}>
                                  ${tarea.monto.toFixed(2)}
                                </td>
                                <td className="text-center">
                                  <span className={`badge ${tarea.pagado ? 'bg-success' : 'bg-warning'}`}>
                                    {tarea.pagado ? 'Pagado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className="text-end">
                                  {!tarea.pagado && `$${tarea.monto.toFixed(2)}`}
                                </td>
                                <td className="text-end">
                                  {tarea.pagado && `$${tarea.monto.toFixed(2)}`}
                                </td>
                              </tr>

                              {documento.tareasAjustes
                                .filter(ajuste => 
                                  (ajuste.tipo_tarea || ajuste.cobro?.tarea) === tarea.tipo_tarea
                                )
                                .map(ajuste => {
                                  const esSuma = ajuste.cobro?.suma > 0;
                                  const unidades = esSuma ? ajuste.cobro.suma : ajuste.cobro.restar;
                                  
                                  return (
                                    <tr key={`ajuste-${ajuste.id}`} className={esSuma ? 'table-success' : 'table-danger'}>
                                      <td colSpan="5" className="text-end small">
                                        {getTipoTarea(ajuste.tipo_tarea || ajuste.cobro?.tarea)} ({esSuma ? 'Suma' : 'Resta'})
                                      </td>
                                      <td className="text-end">{unidades}</td>
                                      <td className="text-end">
                                        {esSuma ? '+' : '-'}${unidades.toFixed(2)}
                                      </td>
                                      <td colSpan="3"></td>
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
        <div className="card-footer bg-light">
          <div className="row align-items-center">
            <div className="col-md-4">
              <span className="badge bg-primary me-2">Cliente</span>
              <span className="badge bg-info me-2">Documento</span>
              <span className="badge bg-light text-dark border">Tarea</span>
            </div>
            <div className="col-md-8 text-md-end">
              <strong className="me-3">Total estimado: ${totals.estimado.toFixed(2)}</strong>
              <strong className="text-primary me-3">Total real: ${totals.real.toFixed(2)}</strong>
              <strong className="text-danger me-3">Deuda neta: ${totals.deudaConFondo.toFixed(2)}</strong>
              <strong className="text-success">Pagado: ${totals.pagado.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosClientesSuperAdmin;
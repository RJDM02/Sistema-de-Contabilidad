import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Modal, Button, Table, Form } from 'react-bootstrap';

const PagosClientesSuperAdmin = () => {
  const [data, setData] = useState({
    cobrosEstimados: [],
    cobrosReales: [],
    tareas: [],
    documentos: [],
    historialFondos: []
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
          'listar_documentacion',
          'historial_fondo'
        ];
        
        const responses = await Promise.all(
          endpoints.map(endpoint => 
            axios.get(`https://sistemacontable-wico.onrender.com/api/${endpoint}/`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );

        // Procesar historial de fondos para obtener montos
        const historialFondos = responses[4].data.reduce((acc, pago) => {
          if (!acc[pago.cliente_id]) {
            acc[pago.cliente_id] = {
              id: pago.cliente_id,
              nombre: pago.cliente_nombre,
              pagos: [],
              monto_extra: 0,
              fondo: 0
            };
          }
          acc[pago.cliente_id].pagos.push(pago);
          
          // Consideramos pagos como monto_extra y el último como fondo
          if (pago.descripcion?.includes('Pago')) {
            acc[pago.cliente_id].monto_extra += pago.monto;
          } else {
            acc[pago.cliente_id].fondo = pago.monto;
          }
          return acc;
        }, {});

        setData({
          cobrosEstimados: responses[0].data,
          cobrosReales: responses[1].data,
          tareas: responses[2].data,
          documentos: responses[3].data,
          historialFondos: Object.values(historialFondos)
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

    // Procesar montos por cliente desde historial
    const montosPorCliente = {};
    data.historialFondos.forEach(cliente => {
      montosPorCliente[cliente.id] = {
        monto_extra: cliente.monto_extra,
        fondo: cliente.fondo
      };
    });

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
          totalReal: 0,
          saldo: 0,
          totalPagado: 0,
          todasTareasPagadas: true,
          monto_extra: montosPorCliente[clienteId]?.monto_extra || 0,
          fondo: montosPorCliente[clienteId]?.fondo || 0,
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
          tareasReales: [],
          tareasAjustes: tareasAjustes,
          cobroEstimado: estimado,
          totalEstimado: totalEstimado,
          totalReal: 0,
          saldo: -totalEstimado,
          pagado: 0,
          estado: 'Pendiente',
          todasPagadas: false,
          valoresBase: {
            notas: estimado.notas || 0,
            subir_notas: estimado.subir_notas || 0,
            bill: estimado.bill || 0,
            open: estimado.open || 0,
            spr: estimado.spr || 0
          }
        });
        
        cliente.totalEstimado += totalEstimado;
        cliente.saldo -= totalEstimado;
      }
    });

    // Procesar cobros reales
    data.cobrosReales.forEach(cobro => {
      if (!cobro.documento || !cobro.documento.id) return;
      
      const documentoCompleto = data.documentos.find(d => d.id === cobro.documento.id);
      if (!documentoCompleto || !documentoCompleto.cliente) return;
      
      const clienteId = documentoCompleto.cliente.id_cliente || documentoCompleto.cliente.id;
      const cliente = clientesMap.get(clienteId);
      if (!cliente) return;
      
      const docId = cobro.documento.id;
      const documento = cliente.documentos.get(docId);
      if (!documento) return;
      
      const unidades = [...(cobro.contenido || []), ...(cobro.contenido_open || []), ...(cobro.contenido_spr || [])]
                      .reduce((sum, item) => sum + (item.unidades || 0), cobro.unidades || 0);
      const monto = unidades * 1;

      const tarea = {
        id: cobro.id,
        tipo_tarea: cobro.tipo_tarea,
        tipo_nombre: getTipoTarea(cobro.tipo_tarea),
        mes: cobro.mes || '',
        unidades: unidades,
        monto: monto,
        contenido: [...(cobro.contenido || []), ...(cobro.contenido_open || []), ...(cobro.contenido_spr || [])],
        tieneContenido: (cobro.contenido?.length > 0) || (cobro.contenido_open?.length > 0) || (cobro.contenido_spr?.length > 0),
        pagado: cobro.pagado || false
      };

      documento.tareasReales.push(tarea);
      documento.totalReal += monto;
      cliente.totalReal += monto;

      if (cobro.pagado) {
        documento.pagado += monto;
        cliente.totalPagado += monto;
        documento.saldo += monto;
        cliente.saldo += monto;
      }

      documento.estado = documento.saldo < 0 ? 'Pendiente' : 
                        documento.saldo === 0 ? 'Al día' : 'A favor';
      documento.todasPagadas = documento.saldo >= 0;
    });

    // Calcular estado general del cliente
    clientesMap.forEach(cliente => {
      // El total pagado ahora incluye los montos extra
      cliente.totalPagado = cliente.totalReal + cliente.monto_extra;
      
      // Calcular saldo final
      const saldoFinal = cliente.totalEstimado - cliente.totalPagado;
      
      // Si hay monto_extra suficiente para cubrir el estimado
      if (cliente.monto_extra >= cliente.totalEstimado) {
        cliente.estado = 'Pagado';
        // El fondo es el excedente (monto_extra - estimado)
        cliente.fondo = cliente.monto_extra - cliente.totalEstimado;
      } else {
        cliente.estado = saldoFinal < 0 ? 'Pendiente' : 
                        saldoFinal === 0 ? 'Al día' : 'A favor';
        cliente.todasTareasPagadas = saldoFinal >= 0;
      }
      
      cliente.saldo = saldoFinal;
    });
    
    return Array.from(clientesMap.values()).map(cliente => ({
      ...cliente,
      documentos: Array.from(cliente.documentos.values()).sort((a, b) => 
        (a.nombre || '').localeCompare(b.nombre || '')
      )
    })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  };

  const { clientesProcesados, clientesUnicos, totals } = useMemo(() => {
    if (loading || error) return { clientesProcesados: [], clientesUnicos: [], totals: {} };

    const clientesProcesados = procesarDatos();

    const totals = {
      estimado: clientesProcesados.reduce((sum, c) => sum + c.totalEstimado, 0),
      real: clientesProcesados.reduce((sum, c) => sum + c.totalReal, 0),
      saldo: clientesProcesados.reduce((sum, c) => sum + c.saldo, 0),
      pagado: clientesProcesados.reduce((sum, c) => sum + c.totalPagado, 0),
      montosExtra: clientesProcesados.reduce((sum, c) => sum + (c.monto_extra || 0), 0),
      fondos: clientesProcesados.reduce((sum, c) => sum + (c.fondo || 0), 0)
    };

    const clientesUnicos = clientesProcesados.map(c => ({
      id: c.id,
      nombre: c.nombre,
      monto_extra: c.monto_extra || 0,
      fondo: c.fondo || 0,
      agencias: c.agencias || []
    }));

    return { clientesProcesados, clientesUnicos, totals };
  }, [data, loading, error]);

  const registrarPago = async () => {
    const { clienteId, monto, fecha } = pagoData;
    if (!clienteId || !monto || parseFloat(monto) <= 0 || !fecha) return;
    
    const token = localStorage.getItem("auth");
    try {
      // Registrar el pago en historial_fondo
      await axios.post(
        `https://sistemacontable-wico.onrender.com/api/historial_fondo/`,
        {
          cliente_id: clienteId,
          monto: parseFloat(monto),
          descripcion: `Pago registrado el ${fecha}`,
          fecha: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Actualizar datos
      await actualizarDatosDespuesPago(token);
      
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

  const actualizarDatosDespuesPago = async (token) => {
    setLoading(true);
    try {
      const [cobrosResponse, estimadosResponse, documentosResponse, fondosResponse] = await Promise.all([
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobro/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobros_estimados/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_documentacion/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/historial_fondo/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Procesar historial de fondos
      const historialFondos = fondosResponse.data.reduce((acc, pago) => {
        if (!acc[pago.cliente_id]) {
          acc[pago.cliente_id] = {
            id: pago.cliente_id,
            nombre: pago.cliente_nombre,
            pagos: [],
            monto_extra: 0,
            fondo: 0
          };
        }
        acc[pago.cliente_id].pagos.push(pago);
        
        if (pago.descripcion?.includes('Pago')) {
          acc[pago.cliente_id].monto_extra += pago.monto;
        } else {
          acc[pago.cliente_id].fondo = pago.monto;
        }
        return acc;
      }, {});

      setData(prev => ({ 
        ...prev, 
        cobrosReales: cobrosResponse.data,
        cobrosEstimados: estimadosResponse.data,
        documentos: documentosResponse.data,
        historialFondos: Object.values(historialFondos)
      }));
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    } finally {
      setLoading(false);
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
                    {cliente.nombre} 
                    {cliente.fondo > 0 && ` (Fondo: $${cliente.fondo.toFixed(2)})`}
                    {cliente.monto_extra > 0 && ` (Monto extra: $${cliente.monto_extra.toFixed(2)})`}
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
            <span className="badge bg-warning me-2">Estimado: ${totals.estimado.toFixed(2)}</span>
            <span className="badge bg-primary me-2">Real: ${totals.real.toFixed(2)}</span>
            <span className="badge bg-success me-2">Monto Extra: ${totals.montosExtra.toFixed(2)}</span>
            <span className="badge bg-secondary me-2">Fondos: ${totals.fondos.toFixed(2)}</span>
            <span className={`badge ${totals.saldo < 0 ? 'bg-danger' : totals.saldo === 0 ? 'bg-success' : 'bg-info'}`}>
              Saldo: ${totals.saldo.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table bordered hover className="mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th className="text-end">Unidades</th>
                  <th className="text-end">Estimado</th>
                  <th className="text-end">Real</th>
                  <th className="text-end">Monto Extra</th>
                  <th className="text-end">Fondos</th>
                  <th>Estado</th>
                  <th className="text-end">Saldo</th>
                  <th className="text-end">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {clientesProcesados.map((cliente, idxCliente) => (
                  <React.Fragment key={`cliente-${cliente.id}`}>
                    <tr 
                      className={`table-primary fw-bold ${
                        cliente.estado === 'Pendiente' ? 'table-warning' : 
                        cliente.estado === 'A favor' ? 'table-info' : 'table-success'
                      }`} 
                      onClick={() => toggleCliente(cliente.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">{idxCliente + 1}</td>
                      <td>{cliente.nombre}</td>
                      <td className="text-end">Total cliente:</td>
                      <td className="text-end">${cliente.totalEstimado.toFixed(2)}</td>
                      <td className="text-end">${cliente.totalReal.toFixed(2)}</td>
                      <td className="text-end">${cliente.monto_extra.toFixed(2)}</td>
                      <td className="text-end">${cliente.fondo.toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`badge ${
                          cliente.estado === 'Pendiente' ? 'bg-warning' : 
                          cliente.estado === 'A favor' ? 'bg-info' : 'bg-success'
                        }`}>
                          {cliente.estado}
                        </span>
                      </td>
                      <td className={`text-end ${
                        cliente.saldo < 0 ? 'text-danger' : 
                        cliente.saldo > 0 ? 'text-success' : ''
                      } fw-bold`}>
                        ${cliente.saldo.toFixed(2)}
                      </td>
                      <td className="text-end text-success fw-bold">${cliente.totalPagado.toFixed(2)}</td>
                    </tr>
                    
                    {expandedClientes[cliente.id] && cliente.documentos.map((documento, idxDoc) => (
                      <React.Fragment key={`doc-${documento.id}`}>
                        <tr 
                          className={`table-info ${
                            documento.estado === 'Pendiente' ? 'table-warning' : 
                            documento.estado === 'A favor' ? 'table-info' : 'table-success'
                          }`} 
                          onClick={() => toggleDocumento(documento.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="text-end">{idxCliente + 1}.{idxDoc + 1}</td>
                          <td>{documento.nombre}</td>
                          <td className="text-end">Total documento:</td>
                          <td className="text-end">${documento.totalEstimado.toFixed(2)}</td>
                          <td className="text-end">${documento.totalReal.toFixed(2)}</td>
                          <td colSpan="2"></td>
                          <td className="text-center">
                            <span className={`badge ${
                              documento.estado === 'Pendiente' ? 'bg-warning' : 
                              documento.estado === 'A favor' ? 'bg-info' : 'bg-success'
                            }`}>
                              {documento.estado}
                            </span>
                          </td>
                          <td className={`text-end ${
                            documento.saldo < 0 ? 'text-danger' : 
                            documento.saldo > 0 ? 'text-success' : ''
                          }`}>
                            ${documento.saldo.toFixed(2)}
                          </td>
                          <td className="text-end text-success">${documento.pagado.toFixed(2)}</td>
                        </tr>
                        
                        {expandedDocumentos[documento.id] && documento.tareasReales.map((tarea) => {
                          const valorEstimado = getValorEstimadoPorTipo(documento, tarea.tipo_tarea);
                          const hayDiscrepancia = Math.abs(tarea.monto - valorEstimado) > 0.01;

                          return (
                            <React.Fragment key={`real-${tarea.id}`}>
                              <tr className={tarea.pagado ? 'table-light' : 'table-warning'}>
                                <td className="text-end">{idxCliente + 1}.{idxDoc + 1}</td>
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
                                <td colSpan="2"></td>
                                <td className="text-center">
                                  <span className={`badge ${tarea.pagado ? 'bg-success' : 'bg-warning'}`}>
                                    {tarea.pagado ? 'Pagado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className={`text-end ${tarea.pagado ? '' : 'text-danger'}`}>
                                  {!tarea.pagado && `$${tarea.monto.toFixed(2)}`}
                                </td>
                                <td className="text-end text-success">
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
                                      <td colSpan="2" className="text-end small">
                                        {getTipoTarea(ajuste.tipo_tarea || ajuste.cobro?.tarea)} ({esSuma ? 'Suma' : 'Resta'})
                                      </td>
                                      <td className="text-end">{unidades}</td>
                                      <td className="text-end">
                                        {esSuma ? '+' : '-'}${unidades.toFixed(2)}
                                      </td>
                                      <td colSpan="6"></td>
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
              <strong className="text-success me-3">Monto extra: ${totals.montosExtra.toFixed(2)}</strong>
              <strong className="text-secondary me-3">Fondos: ${totals.fondos.toFixed(2)}</strong>
              <strong className={`me-3 ${
                totals.saldo < 0 ? 'text-danger' : totals.saldo > 0 ? 'text-success' : ''
              }`}>
                Saldo neto: ${totals.saldo.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosClientesSuperAdmin;
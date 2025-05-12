import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ComparativaTotalCobrar = () => {
  const [cobrosEstimados, setCobrosEstimados] = useState([]);
  const [cobrosReales, setCobrosReales] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClientes, setExpandedClientes] = useState({});
  const [expandedDocumentos, setExpandedDocumentos] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    cobroEstimadoId: null,
    tipoOperacion: 'suma',
    tipoTarea: 1,
    unidades: 0,
    documentoId: null,
    documentoNombre: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("auth");
    try {
      setLoading(true);
      setError(null);
      
      const [estimadosRes, realesRes, tareasRes, documentosRes] = await Promise.all([
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobros_estimados/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_cobro/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_tarea/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('https://sistemacontable-wico.onrender.com/api/listar_documentacion/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setCobrosEstimados(estimadosRes.data);
      setCobrosReales(realesRes.data);
      setTareas(tareasRes.data);
      setDocumentos(documentosRes.data);
    } catch (err) {
      setError(err.message);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const getTipoTarea = (tipo) => {
    switch(tipo) {
      case 1: return 'Notas';
      case 2: return 'Subir Notas';
      case 3: return 'Bill';
      case 4: return 'Open';
      case 5: return 'SPR';
      default: return 'Desconocido';
    }
  };

  const getTotalEstimadoConAjustes = (cobroEstimadoId) => {
    const cobro = cobrosEstimados.find(ce => ce.id === cobroEstimadoId);
    if (!cobro) return 0;
    
    const totalBase = (cobro.bill || 0) + (cobro.notas || 0) + (cobro.subir_notas || 0) + (cobro.open || 0) + (cobro.spr || 0);
    
    const tareasCobro = tareas.filter(t => t.cobro?.id === cobroEstimadoId);
    const ajusteTotal = tareasCobro.reduce((sum, tarea) => {
      return sum + (tarea.cobro.suma || 0) - (tarea.cobro.restar || 0);
    }, 0);
    
    return totalBase + ajusteTotal;
  };

  const getTareasPorCobro = (cobroEstimadoId) => {
    return tareas
      .filter(t => t.cobro?.id === cobroEstimadoId)
      .map(t => ({
        ...t,
        tipo_tarea: t.tipo_tarea || t.cobro?.tarea
      }));
  };

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

  const handleShowModal = (cobroEstimadoId, tipoOperacion, documentoId, documentoNombre) => {
    setModalData({
      cobroEstimadoId,
      tipoOperacion,
      tipoTarea: 1,
      unidades: 0,
      documentoId,
      documentoNombre
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmitOperacion = async () => {
    const token = localStorage.getItem("auth");
    try {
      const dataToSend = {
        cobro: modalData.cobroEstimadoId,
        tarea: modalData.tipoTarea,
        sumar: modalData.tipoOperacion === 'suma' ? modalData.unidades : 0,
        restar: modalData.tipoOperacion === 'resta' ? modalData.unidades : 0
      };

      await axios.post(
        'https://sistemacontable-wico.onrender.com/api/crear_tarea/',
        dataToSend,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Operación registrada correctamente");
      fetchData();
      setShowModal(false);
    } catch (err) {
      toast.error("Error al guardar operación: " + (err.response?.data?.message || err.message));
    }
  };

  const procesarDatos = () => {
    const clientesMap = new Map();

    // Procesar documentos para obtener relación documento-cliente
    documentos.forEach(doc => {
      if (!doc || !doc.id || !doc.cliente) return;

      if (!clientesMap.has(doc.cliente.id_cliente)) {
        clientesMap.set(doc.cliente.id_cliente, {
          id: doc.cliente.id_cliente,
          nombre: doc.cliente.nombre_cliente,
          documentos: new Map(),
          totalUnidadesContenido: 0, // Nuevo campo para unidades de contenido
          totalMonto: 0,
          totalEstimado: 0,
          totalAjustes: 0,
          totalDiscrepancias: 0
        });
      }
    });

    // Procesar cobros estimados
    cobrosEstimados.forEach(estimado => {
      if (!estimado.documento || !estimado.documento.id) return;
      
      const documentoCompleto = documentos.find(d => d.id === estimado.documento.id);
      if (!documentoCompleto || !documentoCompleto.cliente) return;
      
      const clienteId = documentoCompleto.cliente.id_cliente;
      const cliente = clientesMap.get(clienteId);
      if (!cliente) return;
      
      const docId = estimado.documento.id;
      
      if (!cliente.documentos.has(docId)) {
        const tareasDoc = getTareasPorCobro(estimado.id);
        const totalAjustes = tareasDoc.reduce((sum, t) => sum + (t.cobro.suma || 0) - (t.cobro.restar || 0), 0);
        
        cliente.documentos.set(docId, {
          id: docId,
          nombre: documentoCompleto.nombre_archivo,
          tareasReales: [],
          tareasAjustes: tareasDoc,
          totalUnidadesContenido: 0, // Nuevo campo para unidades de contenido
          totalMonto: 0,
          estimados: {
            bill: estimado.bill || 0,
            notas: estimado.notas || 0,
            subir_notas: estimado.subir_notas || 0,
            open: estimado.open || 0,
            spr: estimado.spr || 0
          },
          totalEstimadoBase: (estimado.bill || 0) + (estimado.notas || 0) + (estimado.subir_notas || 0) + 
                           (estimado.open || 0) + (estimado.spr || 0),
          totalAjustes: totalAjustes,
          cobroEstimadoId: estimado.id,
          totalEstimado: getTotalEstimadoConAjustes(estimado.id),
          tienePagosInsertados: false,
          tieneDiscrepancia: false
        });
        
        cliente.totalEstimado += getTotalEstimadoConAjustes(estimado.id);
        cliente.totalAjustes += totalAjustes;
      }
    });

    // Procesar cobros reales
    cobrosReales.forEach(cobro => {
      if (!cobro.documento || !cobro.documento.id) return;
      
      const documentoCompleto = documentos.find(d => d.id === cobro.documento.id);
      if (!documentoCompleto || !documentoCompleto.cliente) return;
      
      const clienteId = documentoCompleto.cliente.id_cliente;
      const cliente = clientesMap.get(clienteId);
      if (!cliente) return;
      
      const docId = cobro.documento.id;
      const documento = cliente.documentos.get(docId);
      if (!documento) return;
      
      // Calcular unidades de contenido
      const unidadesContenido = [...(cobro.contenido || []), ...(cobro.contenido_open || []), ...(cobro.contenido_spr || [])]
                              .reduce((sum, item) => sum + (item.unidades || 0), 0);
      
      const unidadesTotales = unidadesContenido + (cobro.unidades || 0);
      const monto = unidadesTotales * 1;
      
      const tarea = {
        id: cobro.id,
        tipo_tarea: cobro.tipo_tarea,
        tipo_nombre: getTipoTarea(cobro.tipo_tarea),
        mes: cobro.mes,
        unidades: unidadesTotales,
        unidadesContenido: unidadesContenido, // Nuevo campo
        monto: monto,
        contenido: [...(cobro.contenido || []), ...(cobro.contenido_open || []), ...(cobro.contenido_spr || [])],
        tieneContenido: unidadesContenido > 0,
        esReal: true
      };
      
      documento.tareasReales.push(tarea);
      documento.totalUnidadesContenido += unidadesContenido; // Solo sumamos contenido
      documento.totalMonto += monto;
      documento.tienePagosInsertados = true;
      
      cliente.totalUnidadesContenido += unidadesContenido; // Solo sumamos contenido
      cliente.totalMonto += monto;
    });

    // Calcular discrepancias y convertir Maps a arrays
    const clientesArray = Array.from(clientesMap.values()).map(cliente => {
      let discrepancias = 0;
      const docsArray = Array.from(cliente.documentos.values());
      
      docsArray.forEach(doc => {
        doc.tieneDiscrepancia = Math.abs(doc.totalMonto - doc.totalEstimado) > 0.01;
        if (doc.tieneDiscrepancia) discrepancias++;
      });
      
      return {
        ...cliente,
        documentos: docsArray,
        totalDiscrepancias: discrepancias
      };
    });

    return clientesArray.sort((a, b) => a.nombre.localeCompare(b.nombre));
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

  const datosProcesados = procesarDatos();
  const totalMonto = datosProcesados.reduce((sum, c) => sum + c.totalMonto, 0);
  const totalEstimado = datosProcesados.reduce((sum, c) => sum + c.totalEstimado, 0);
  const totalAjustes = datosProcesados.reduce((sum, c) => sum + c.totalAjustes, 0);
  const totalDiscrepancias = datosProcesados.reduce((sum, c) => sum + c.totalDiscrepancias, 0);
  const totalUnidadesContenido = datosProcesados.reduce((sum, c) => sum + c.totalUnidadesContenido, 0);

  return (
    <div className="container-fluid mt-3">
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalData.tipoOperacion === 'suma' ? 'Sumar unidades' : 'Restar unidades'} - {modalData.documentoNombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tipo de Tarea</Form.Label>
              <Form.Select 
                value={modalData.tipoTarea}
                onChange={(e) => setModalData({...modalData, tipoTarea: parseInt(e.target.value)})}
              >
                <option value={1}>Notas</option>
                <option value={2}>Subir Notas</option>
                <option value={3}>Bill</option>
                <option value={4}>Open</option>
                <option value={5}>SPR</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Unidades a {modalData.tipoOperacion === 'suma' ? 'sumar' : 'restar'}</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                value={modalData.unidades}
                onChange={(e) => setModalData({...modalData, unidades: parseInt(e.target.value) || 0})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmitOperacion}>
            Confirmar {modalData.tipoOperacion === 'suma' ? 'Suma' : 'Resta'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h3 className="m-0">Comparativa Total a Cobrar</h3>
          <div>
            <span className="badge bg-info me-2">Clientes: {datosProcesados.length}</span>
            <span className="badge bg-primary me-2">Pagos: ${totalMonto.toFixed(2)}</span>
            <span className="badge bg-warning me-2">Estimado: ${totalEstimado.toFixed(2)}</span>
            <span className={`badge ${totalAjustes >= 0 ? 'bg-success' : 'bg-danger'}`}>
              Ajustes: ${totalAjustes.toFixed(2)}
            </span>
            {totalDiscrepancias > 0 && (
              <span className="badge bg-danger">Discrepancias: {totalDiscrepancias}</span>
            )}
            <span className="badge bg-secondary ms-2">Unidades Contenido: {totalUnidadesContenido}</span>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Tipo Tarea</th>
                  <th>Unidades (Contenido)</th>
                  <th>Pagos Insertados</th>
                  <th>Cobros Estimados</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosProcesados.map((cliente, idxCliente) => (
                  <React.Fragment key={`cliente-${cliente.id}`}>
                    <tr 
                      className={`table-primary fw-bold ${cliente.totalDiscrepancias > 0 ? 'table-danger' : ''}`} 
                      onClick={() => toggleCliente(cliente.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">{idxCliente + 1}</td>
                      <td colSpan="2">{cliente.nombre}</td>
                      <td className="text-end">Total cliente:</td>
                      <td className="text-end">{cliente.totalUnidadesContenido}</td>
                      <td className="text-end">${cliente.totalMonto.toFixed(2)}</td>
                      <td className="text-end">
                        ${cliente.totalEstimado.toFixed(2)}
                        {cliente.totalAjustes !== 0 && (
                          <div className={`small ${cliente.totalAjustes >= 0 ? 'text-success' : 'text-danger'}`}>
                            (Base: ${(cliente.totalEstimado - cliente.totalAjustes).toFixed(2)})
                          </div>
                        )}
                        {cliente.totalDiscrepancias > 0 && (
                          <div className="small text-danger">
                            Discrepancias: {cliente.totalDiscrepancias}
                          </div>
                        )}
                      </td>
                      <td></td>
                    </tr>
                    
                    {expandedClientes[cliente.id] && cliente.documentos.map((documento, idxDoc) => (
                      <React.Fragment key={`doc-${documento.id}`}>
                        <tr 
                          className={`${documento.tieneDiscrepancia ? 'table-danger' : documento.tienePagosInsertados ? 'table-info' : 'table-warning'}`} 
                          onClick={() => toggleDocumento(documento.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="text-end">{idxCliente + 1}.{idxDoc + 1}</td>
                          <td colSpan="1"></td>
                          <td>{documento.nombre}</td>
                          <td className="text-end">Total documento:</td>
                          <td className="text-end">{documento.totalUnidadesContenido}</td>
                          <td className="text-end">${documento.totalMonto.toFixed(2)}</td>
                          <td className="text-end">
                            ${documento.totalEstimado.toFixed(2)}
                            {documento.totalAjustes !== 0 && (
                              <div className={`small ${documento.totalAjustes >= 0 ? 'text-success' : 'text-danger'}`}>
                                (Base: ${documento.totalEstimadoBase.toFixed(2)})
                              </div>
                            )}
                            {documento.tieneDiscrepancia && (
                              <div className="small text-danger">
                                Diferencia: ${(documento.totalMonto - documento.totalEstimado).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            {documento.cobroEstimadoId && (
                              <>
                                <button 
                                  className="btn btn-sm btn-success me-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowModal(documento.cobroEstimadoId, 'suma', documento.id, documento.nombre);
                                  }}
                                >
                                  <i className="bi bi-plus"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowModal(documento.cobroEstimadoId, 'resta', documento.id, documento.nombre);
                                  }}
                                >
                                  <i className="bi bi-dash"></i>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        
                        {expandedDocumentos[documento.id] && (
                          <>
                            {/* Mostrar cobros reales */}
                            {documento.tareasReales.map((tarea) => (
                              <tr key={`real-${tarea.id}`} className="table-light">
                                <td colSpan="2"></td>
                                <td>
                                  {getTipoTarea(tarea.tipo_tarea)} - {tarea.mes}
                                  {tarea.tieneContenido && (
                                    <span className="ms-2 badge bg-secondary">Detalle</span>
                                  )}
                                </td>
                                <td></td>
                                <td className="text-end">
                                  {tarea.tieneContenido ? tarea.unidadesContenido : '-'}
                                </td>
                                <td className="text-end">${tarea.monto.toFixed(2)}</td>
                                <td className="text-end">
                                  {/* Mostrar el valor estimado correspondiente al tipo de tarea */}
                                  {tarea.tipo_tarea === 1 && documento.estimados.notas.toFixed(2)}
                                  {tarea.tipo_tarea === 2 && documento.estimados.subir_notas.toFixed(2)}
                                  {tarea.tipo_tarea === 3 && documento.estimados.bill.toFixed(2)}
                                  {tarea.tipo_tarea === 4 && documento.estimados.open.toFixed(2)}
                                  {tarea.tipo_tarea === 5 && documento.estimados.spr.toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            ))}

                            {/* Mostrar ajustes manuales */}
                            {documento.tareasAjustes.map((tarea) => {
                              const tipoTarea = tarea.tipo_tarea || tarea.cobro?.tarea;
                              const esSuma = tarea.cobro?.suma > 0;
                              const unidades = esSuma ? tarea.cobro.suma : tarea.cobro.restar;
                              
                              return (
                                <tr 
                                  key={`ajuste-${tarea.id}`} 
                                  className={esSuma ? 'table-success' : 'table-danger'}
                                >
                                  <td colSpan="2"></td>
                                  <td>
                                    {getTipoTarea(tipoTarea)} ({esSuma ? 'Suma' : 'Resta'})
                                  </td>
                                  <td></td>
                                  <td className="text-end">-</td>
                                  <td className="text-end">
                                    {esSuma ? '+' : '-'}${unidades.toFixed(2)}
                                  </td>
                                  <td className="text-end">
                                    {/* Mostrar el valor estimado correspondiente al tipo de tarea */}
                                    {tipoTarea === 1 && documento.estimados.notas.toFixed(2)}
                                    {tipoTarea === 2 && documento.estimados.subir_notas.toFixed(2)}
                                    {tipoTarea === 3 && documento.estimados.bill.toFixed(2)}
                                    {tipoTarea === 4 && documento.estimados.open.toFixed(2)}
                                    {tipoTarea === 5 && documento.estimados.spr.toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="card-footer bg-light">
          <div className="row align-items-center">
            <div className="col-md-4">
              <span className="badge bg-primary me-2">Cliente</span>
              <span className="badge bg-info me-2">Documento</span>
              <span className="badge bg-light text-dark border">Tarea</span>
              {totalDiscrepancias > 0 && (
                <span className="badge bg-danger">Discrepancias: {totalDiscrepancias}</span>
              )}
            </div>
            <div className="col-md-8 text-md-end">
              <strong className="me-3">Total pagos: ${totalMonto.toFixed(2)}</strong>
              <strong className="text-warning me-3">Total estimado: ${totalEstimado.toFixed(2)}</strong>
              <strong className={totalAjustes >= 0 ? 'text-success' : 'text-danger'}>
                Total ajustes: ${totalAjustes.toFixed(2)}
              </strong>
              <strong className="text-secondary ms-3">Unidades Contenido: {totalUnidadesContenido}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparativaTotalCobrar;
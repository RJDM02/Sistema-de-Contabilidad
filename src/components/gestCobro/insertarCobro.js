import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarCobro = () => {
  const navigate = useNavigate();
  
  // Estados para controlar la UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estado principal del formulario
  const [formData, setFormData] = useState({
    categoria: '',
    cliente_id: '',
    tipo_tarea: '',
    documento_id: '',
    mes: '',  
    registros: [],
    usuario_supervisor: ''
  });

  // Estados para datos obtenidos de la API
  const [clientes, setClientes] = useState([]);
  const [documentosCliente, setDocumentosCliente] = useState([]);
  const [todosDocumentos, setTodosDocumentos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [puedeSubirNotas, setPuedeSubirNotas] = useState(false);

  // Mapeo de tipos de tarea UI a valores de backend
  const tipoTareaMapping = {
    '1': 1,             // Notas
    '2': 2,             // Subir notas al Sistema
    '3': 3,             // Bill
    '4': 4,             // Open
    '5': 5              // SPR
  };

  // Unidades por tipo de tarea
  const unidadesPorTipoTarea = {
    '4': 50,            // Open: 50 unidades por registro
    '5': 25             // SPR: 25 unidades por registro
  };

  // Lista de meses para el select
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Función para obtener token y permisos
  const getToken = () => {
    const token = localStorage.getItem('auth');
    const role = localStorage.getItem('role');
    const subirNotas = localStorage.getItem('subir_notas') === 'true';
    
    setUserRole(role);
    setPuedeSubirNotas(subirNotas);
    return token;
  };

  // Función para calcular unidades base según rangos para Realizar Bill
  const calcularUnidadesRealizarBill = (totalUnidades) => {
    if (totalUnidades <= 40) return 10;
    if (totalUnidades <= 75) return 20;
    if (totalUnidades <= 100) return 30;
    if (totalUnidades <= 160) return 40;
    if (totalUnidades <= 194) return 50;
    return 60; // Para 195 o más
  };

  const calcularUnidadesNotas = (tipoTarea, totalRegistros, registros = []) => {
    if (tipoTarea === '2') { // Subir notas al Sistema
      return 20; // Siempre 20 unidades
    } else if (tipoTarea === '3') { // Realizar Bill
      const totalUnidades = registros.reduce((sum, registro) => sum + (registro.unidades || 0), 0);
      const unidadesBase = calcularUnidadesRealizarBill(totalUnidades);
      return Math.round(unidadesBase); 
    }
    return 0;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.categoria) newErrors.categoria = 'La categoría es requerida';
    if (!formData.cliente_id) newErrors.cliente_id = 'El cliente es requerido';
    if (!formData.tipo_tarea) newErrors.tipo_tarea = 'El tipo de tarea es requerido';
    if (!formData.documento_id) newErrors.documento_id = 'El documento es requerido';
    if (!formData.mes) newErrors.mes = 'El mes es requerido';
    
    if (['1', '4', '5'].includes(formData.tipo_tarea) && formData.registros.length === 0) {
      newErrors.registros = 'Debe seleccionar al menos un registro';
    }
    
    if (userRole === 'user_Supervisado' && !formData.usuario_supervisor) {
      newErrors.usuario_supervisor = 'Debe seleccionar un supervisor';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'categoria') {
      setFormData({
        categoria: value,
        cliente_id: '',
        tipo_tarea: '',
        documento_id: '',
        registros: [],
        usuario_supervisor: '',
        mes: ''
      });
      setDocumentosCliente([]);
      setRegistros([]);
      setTotalRegistros(0);
    } else if (name === 'cliente_id') {
      setFormData({
        ...formData,
        cliente_id: value,
        tipo_tarea: '',
        documento_id: '',
        registros: [],
        usuario_supervisor: ''
      });
      setRegistros([]);
      setTotalRegistros(0);
    } else if (name === 'tipo_tarea') {
      setFormData({
        ...formData,
        tipo_tarea: value,
        documento_id: '',
        registros: [],
        usuario_supervisor: ''
      });
      setTotalRegistros(0);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectRegistro = (registroId) => {
    setFormData(prev => {
      const nuevosRegistros = prev.registros.includes(registroId)
        ? prev.registros.filter(id => id !== registroId)
        : [...prev.registros, registroId];
      
      return { ...prev, registros: nuevosRegistros };
    });
    
    if (errors.registros && formData.registros.length > 0) {
      setErrors(prev => ({ ...prev, registros: '' }));
    }
  };

  const selectAllRegistros = () => {
    const todosLosIds = registros.map(r => r.id);
    
    if (formData.registros.length === todosLosIds.length) {
      setFormData(prev => ({ ...prev, registros: [] }));
    } else {
      setFormData(prev => ({ ...prev, registros: todosLosIds }));
    }
    
    if (errors.registros) {
      setErrors(prev => ({ ...prev, registros: '' }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        const clientesResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/list_client/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClientes(clientesResponse.data);
        
        const documentosResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/listar_documentacion/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodosDocumentos(documentosResponse.data);

        if (userRole === 'user_Supervisado') {
          const supervisoresResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/usuario/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const supervisoresFiltrados = supervisoresResponse.data.filter(
            usuario => usuario.rol.nombre === 'user_Supervisor'
          );
          setSupervisores(supervisoresFiltrados);
        }
        
      } catch (error) {
        toast.error('Error al cargar datos iniciales');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userRole]);

  useEffect(() => {
    const fetchDocumentos = async () => {
      if (!formData.cliente_id) {
        setDocumentosCliente([]);
        return;
      }
  
      try {
        setLoading(true);
        const token = getToken();
  
        if (['4', '5'].includes(formData.tipo_tarea)) {
          const response = await axios.get(
            `https://sistemacontable-wico.onrender.com/api/list_client_document_all/${formData.cliente_id}/`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { cliente_id: formData.cliente_id }
            }
          );
  
          if (Array.isArray(response.data)) {
            const documentosMapeados = [];
            response.data.forEach(cliente => {
              if (cliente.id === parseInt(formData.cliente_id)) {
                documentosMapeados.push(...cliente.documentos);
              }
            });
            setDocumentosCliente(documentosMapeados);
          } else if (response.data && response.data.documentos) {
            setDocumentosCliente(response.data.documentos);
          } else {
            setDocumentosCliente([]);
          }
        } 
        else if (['2', '3'].includes(formData.tipo_tarea)) {
          const response = await axios.get(
            `https://sistemacontable-wico.onrender.com/api/list_client_document_all/${formData.cliente_id}/`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { cliente_id: formData.cliente_id }
            }
          );
  
          if (Array.isArray(response.data)) {
            const documentosMapeados = [];
            response.data.forEach(cliente => {
              if (cliente.id === parseInt(formData.cliente_id)) {
                documentosMapeados.push(...cliente.documentos);
              }
            });
            setDocumentosCliente(documentosMapeados);
          } else if (response.data && response.data.documentos) {
            setDocumentosCliente(response.data.documentos);
          } else {
            setDocumentosCliente([]);
          }
        } 
        else {
          const docsCliente = todosDocumentos.filter(
            doc => doc.cliente.id_cliente === parseInt(formData.cliente_id)
          );
          setDocumentosCliente(docsCliente);
        }
      } catch (error) {
        toast.error('Error al cargar documentos del cliente');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchDocumentos();
    setRegistros([]);
    setFormData(prev => ({ ...prev, documento_id: '', registros: [] }));
  }, [formData.cliente_id, formData.tipo_tarea, todosDocumentos]);

  useEffect(() => {
    const fetchRegistros = async () => {
      if (!formData.documento_id || !formData.cliente_id) {
        setRegistros([]);
        setTotalRegistros(0);
        return;
      }
      
      try {
        setLoading(true);
        const token = getToken();
  
        if (['2', '3'].includes(formData.tipo_tarea)) {
          const response = await axios.get(
            `https://sistemacontable-wico.onrender.com/api/list_client_document_all/${formData.cliente_id}/`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { document_id: formData.documento_id }
            }
          );
          
          const docSeleccionado = response.data.documentos?.find(
            doc => doc.id === parseInt(formData.documento_id)
          );
          
          if (formData.tipo_tarea === '3' && docSeleccionado?.contenido_registros) {
            setRegistros(docSeleccionado.contenido_registros);
            const totalUnidades = docSeleccionado.contenido_registros.reduce(
              (sum, registro) => sum + (registro.unidades || 0), 0
            );
            setTotalRegistros(totalUnidades);
          } else {
            setRegistros([]);
            setTotalRegistros(docSeleccionado?.total_registros || 0);
          }
        } 
        else if (['4', '5'].includes(formData.tipo_tarea)) {
          const response = await axios.get(
            `https://sistemacontable-wico.onrender.com/api/list_client_document_all/${formData.cliente_id}/`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { document_id: formData.documento_id }
            }
          );
          
          const docSeleccionado = response.data.documentos?.find(
            doc => doc.id === parseInt(formData.documento_id)
          );
          
          setRegistros(docSeleccionado?.contenido_registros || []);
        }
        else {
          const response = await axios.get(
            `https://sistemacontable-wico.onrender.com/api/list_client_document/${formData.cliente_id}/`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { document_id: formData.documento_id }
            }
          );
          
          const docSeleccionado = response.data.documentos.find(
            doc => doc.id === parseInt(formData.documento_id)
          );
          
          setRegistros(docSeleccionado?.contenido_registros || []);
        }
      } catch (error) {
        toast.error('Error al cargar registros del documento');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegistros();
  }, [formData.documento_id, formData.cliente_id, formData.tipo_tarea, documentosCliente]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = getToken();
      const tipoTareaBackend = tipoTareaMapping[formData.tipo_tarea];
      
      if (['2', '3'].includes(formData.tipo_tarea)) {
        const unidades = calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros);
        
        const datosParaEnviar = {
          cliente: parseInt(formData.cliente_id),
          documento: parseInt(formData.documento_id),
          tipo_tarea: tipoTareaBackend,
          unidades: unidades,
          mes: formData.mes
        };
  
        if (userRole === 'user_Supervisado' && formData.usuario_supervisor) {
          datosParaEnviar.usuario_supervisor = parseInt(formData.usuario_supervisor);
        }
  
        const cobroResponse = await axios.post(
          'https://sistemacontable-wico.onrender.com/api/insertar_cobro/',
          datosParaEnviar,
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!cobroResponse.data || !cobroResponse.data.success) {
          throw new Error(cobroResponse.data?.error || 'Error al crear el cobro');
        }
  
        toast.success('Cobro registrado correctamente');
        setTimeout(() => navigate('/gestCobro/listarCobros'), 1500);
  
      } else {
        let contenidoRegistro = [];
        
        if (['4', '5'].includes(formData.tipo_tarea)) {
          const unidadesFijas = unidadesPorTipoTarea[formData.tipo_tarea];
          contenidoRegistro = formData.registros.map(id => {
            const registro = registros.find(r => r.id === id);
            return {
              id: id,
              nombre_completo: registro?.nombre_completo || `Registro ${id}`,
              unidades: unidadesFijas
            };
          });
        } else {
          contenidoRegistro = formData.registros.map(id => {
            const registro = registros.find(r => r.id === id);
            return {
              id: id,
              nombre_completo: registro?.nombre_completo || `Registro ${id}`,
              unidades: registro?.unidades || 1
            };
          });
        }
        
        const datosParaEnviar = {
          cliente: parseInt(formData.cliente_id),
          documento: parseInt(formData.documento_id),
          tipo_tarea: tipoTareaBackend,
          contenido_registro: contenidoRegistro,
          mes: formData.mes
        };
        
        if (userRole === 'user_Supervisado' && formData.usuario_supervisor) {
          datosParaEnviar.usuario_supervisor = parseInt(formData.usuario_supervisor);
        }
        
        const response = await axios.post(
          'https://sistemacontable-wico.onrender.com/api/insertar_cobro/',
          datosParaEnviar,
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data && response.data.success) {
          toast.success('Cobro registrado correctamente');
          setTimeout(() => navigate('/gestCobro/listarCobros'), 1500);
        } else {
          throw new Error(response.data?.error || 'Error al registrar el cobro');
        }
      }
    } catch (error) {
      console.error("Error detallado:", error.response?.data || error);
      
      if (error.response) {
        toast.error(
          error.response.data?.error || 
          error.response.data?.message || 
          'Error al procesar la solicitud'
        );
      } else {
        toast.error(error.message || 'Error inesperado al procesar la solicitud');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clientesFiltrados = clientes.filter(cliente => 
    formData.categoria ? cliente.categoria === parseInt(formData.categoria) : true
  );

  const documentosFiltrados = documentosCliente.filter(doc => {
    if (['4', '5'].includes(formData.tipo_tarea)) {
      return true; 
    } else if (['2', '3'].includes(formData.tipo_tarea)) {
      return true;
    } else if (formData.tipo_tarea === '1') {
      return doc.tipo === 1;
    }
    return false;
  });

  return (
    <div className="container mt-4" style={{ marginBottom: '100px' }}>
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2>Registrar Nuevo Cobro</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. Categoría */}
            <div className="mb-3">
              <label className="form-label">Categoría del Cliente *</label>
              <select
                name="categoria"
                className={`form-select ${errors.categoria ? 'is-invalid' : ''}`}
                value={formData.categoria}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Seleccione una categoría</option>
                <option value="1">Terapia</option>
                <option value="2">TCM</option>
              </select>
              {errors.categoria && <div className="invalid-feedback">{errors.categoria}</div>}
            </div>

            {/* 2. Cliente */}
            <div className="mb-3">
              <label className="form-label">Cliente *</label>
              <select
                name="cliente_id"
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                value={formData.cliente_id}
                onChange={handleChange}
                required
                disabled={!formData.categoria || loading}
              >
                <option value="">Seleccione un cliente</option>
                {clientesFiltrados.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
            </div>

            {/* 3. Tipo de Tarea (MODIFICADO) */}
            <div className="mb-3">
              <label className="form-label">Tipo Trabajo Realizado *</label>
              <select
                name="tipo_tarea"
                className={`form-select ${errors.tipo_tarea ? 'is-invalid' : ''}`}
                value={formData.tipo_tarea}
                onChange={handleChange}
                required
                disabled={!formData.cliente_id || loading}
              >
                <option value="">Seleccione un tipo</option>
                <option value="1">Notas</option>
                {puedeSubirNotas && <option value="2">Subir notas al Sistema</option>}
                <option value="3">Bill</option>
                <option value="4">Open</option>
                <option value="5">SPR</option>
              </select>
              {errors.tipo_tarea && <div className="invalid-feedback">{errors.tipo_tarea}</div>}
            </div>

            {/* 4. Documento */}
            <div className="mb-3">
              <label className="form-label">Documento *</label>
              <select
                name="documento_id"
                className={`form-select ${errors.documento_id ? 'is-invalid' : ''}`}
                value={formData.documento_id}
                onChange={handleChange}
                required
                disabled={!formData.tipo_tarea || loading || !documentosCliente.length}
              >
                <option value="">Seleccione un documento</option>
                {documentosFiltrados.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre_archivo} - {new Date(doc.fecha_creacion).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.documento_id && <div className="invalid-feedback">{errors.documento_id}</div>}
              {documentosFiltrados.length === 0 && formData.tipo_tarea && formData.cliente_id && !loading && !errors.documento_id && (
                <div className="text-danger mt-1">
                  No hay documentos disponibles para este cliente y tipo de trabajo
                </div>
              )}
            </div>

            {/* 5. Mes */}
            <div className="mb-3">
              <label className="form-label">Mes *</label>
              <select
                name="mes"
                className={`form-select ${errors.mes ? 'is-invalid' : ''}`}
                value={formData.mes}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Seleccione un mes</option>
                {meses.map(mes => (
                  <option key={mes} value={mes}>
                    {mes.charAt(0).toUpperCase() + mes.slice(1)}
                  </option>
                ))}
              </select>
              {errors.mes && <div className="invalid-feedback">{errors.mes}</div>}
            </div>

            {/* 6. Supervisor (solo para user_Supervisado) */}
            {userRole === 'user_Supervisado' && (
              <div className="mb-3">
                <label className="form-label">Supervisor *</label>
                <select
                  name="usuario_supervisor"
                  className={`form-select ${errors.usuario_supervisor ? 'is-invalid' : ''}`}
                  value={formData.usuario_supervisor}
                  onChange={handleChange}
                  required
                  disabled={loading || supervisores.length === 0}
                >
                  <option value="">Seleccione un supervisor</option>
                  {supervisores.map(supervisor => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.first_name + ' ' + supervisor.last_name}
                    </option>
                  ))}
                </select>
                {errors.usuario_supervisor && (
                  <div className="invalid-feedback">{errors.usuario_supervisor}</div>
                )}
              </div>
            )}

            {/* 7. Info para tareas de notas (Subir/Realizar) */}
            {['2', '3'].includes(formData.tipo_tarea) && formData.documento_id && (
              <div className="mb-4">
                <div className="alert alert-info">
                  {formData.tipo_tarea === '2' ? (
                    <>
                      <strong>Total de registros:</strong> {totalRegistros}
                      <br />
                      <strong>Unidades a cobrar:</strong> {calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros)} unidades (Subir notas al Sistema: 20 unidades)
                    </>
                  ) : (
                    <>
                      <strong>Total de unidades en registros:</strong> {totalRegistros}u
                      <br />
                      <strong>Unidades a cobrar:</strong> {calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros)}u
                      <br />
                      <strong>Cálculo:</strong> {calcularUnidadesRealizarBill(totalRegistros)}u 
                      <br />
                      <small>
                        Rangos: 0-40u:10u | 41-75u:20u | 76-100u:30u | 101-160u:40u | 161-194u:50u | ≥195u:60u
                      </small>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 8. Info para Open/SPR */}
            {['4', '5'].includes(formData.tipo_tarea) && formData.documento_id && (
              <div className="mb-2">
                <div className="alert alert-info">
                  <strong>Información de unidades:</strong>
                  {formData.tipo_tarea === '4' && ' Para cada registro seleccionado, se aplicarán 50 unidades (Open)'}
                  {formData.tipo_tarea === '5' && ' Para cada registro seleccionado, se aplicarán 25 unidades (SPR)'}
                </div>
              </div>
            )}

            {/* 9. Selección de Registros (Bill/Open/SPR) */}
            {['1', '4', '5'].includes(formData.tipo_tarea) && registros.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Registros *</label>
                <div 
                  className={`border p-3 rounded ${errors.registros ? 'border-danger' : ''}`}
                  style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}
                >
                  <div className="form-check mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="selectAll"
                      checked={formData.registros.length === registros.length && registros.length > 0}
                      onChange={selectAllRegistros}
                    />
                    <label className="form-check-label" htmlFor="selectAll">
                      <strong>Seleccionar todos</strong>
                    </label>
                  </div>
                  
                  {registros.map(registro => (
                    <div key={registro.id} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`registro-${registro.id}`}
                        checked={formData.registros.includes(registro.id)}
                        onChange={() => handleSelectRegistro(registro.id)}
                      />
                      <label className="form-check-label" htmlFor={`registro-${registro.id}`}>
                        {registro.nombre_completo}
                        {['4', '5'].includes(formData.tipo_tarea) && (
                          <span className="ms-2 text-success">
                            ({formData.tipo_tarea === '4' ? '50 unidades' : '25 unidades'})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.registros && <div className="text-danger">{errors.registros}</div>}
                <small className="text-muted">
                  {formData.registros.length} de {registros.length} registros seleccionados
                  {['4', '5'].includes(formData.tipo_tarea) && formData.registros.length > 0 && (
                    <span> ({formData.registros.length} × {formData.tipo_tarea === '4' ? '50' : '25'} = 
                    {formData.registros.length * (formData.tipo_tarea === '4' ? 50 : 25)} unidades totales)</span>
                  )}
                </small>
              </div>
            )}

            {/* Botones */}
            <div 
              className="d-flex justify-content-between mt-4"
              style={{
                position: 'sticky',
                bottom: '0',
                backgroundColor: 'white',
                padding: '15px 0',
                borderTop: '1px solid #dee2e6',
                marginTop: '20px'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/gestCobro/listarCobros')}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Registrar Cobro'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default InsertarCobro;
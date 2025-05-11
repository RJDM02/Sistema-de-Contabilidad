import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarPagoCobros = () => {
  const navigate = useNavigate();
  
  // Estados para controlar la UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estado principal del formulario
  const [formData, setFormData] = useState({
    usuario_id: '',       
    categoria: '',
    cliente_id: '',
    tipo_tarea: '',
    documento_id: '',
    mes: '',  
    registros: [],
    usuario_supervisor: ''
  });

  // Estados para datos obtenidos de la API
  const [trabajadores, setTrabajadores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [documentosCliente, setDocumentosCliente] = useState([]);
  const [todosDocumentos, setTodosDocumentos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalUnidades, setTotalUnidades] = useState(0);
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

  // Función para calcular unidades para Bill según la nueva escala
  const calcularUnidadesBill = (totalUnidades) => {
    if (totalUnidades <= 40) return 10;
    if (totalUnidades <= 75) return 20;
    if (totalUnidades <= 100) return 30;
    if (totalUnidades <= 160) return 40;
    if (totalUnidades <= 194) return 50;
    return 60; // Para 195 o más unidades
  };

  // Función para calcular unidades para notas (tipo 2) y Bill (tipo 3)
  const calcularUnidadesNotas = (tipoTarea, totalRegistros, registros = []) => {
    if (tipoTarea === '2') { // Subir notas al Sistema
      // Fórmula original: hasta 5 clientes = 10 unidades, 6+ = 20 unidades
      return totalRegistros <= 5 ? 10 : 20;
    } else if (tipoTarea === '3') { // Bill
      const totalUnidades = registros.reduce((sum, registro) => sum + (registro.unidades || 0), 0);
      return calcularUnidadesBill(totalUnidades);
    }
    return 0;
  };

  // Función para obtener token
  const getToken = () => {
    return localStorage.getItem('auth');
  };

  // Función para validar el formulario
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.usuario_id) newErrors.usuario_id = 'El trabajador es requerido';
    if (!formData.categoria) newErrors.categoria = 'La categoría es requerida';
    if (!formData.cliente_id) newErrors.cliente_id = 'El cliente es requerido';
    if (!formData.tipo_tarea) newErrors.tipo_tarea = 'El tipo de tarea es requerido';
    if (!formData.documento_id) newErrors.documento_id = 'El documento es requerido';
    if (!formData.mes) newErrors.mes = 'El mes es requerido';
    
    if (['1', '4', '5'].includes(formData.tipo_tarea) && formData.registros.length === 0) {
      newErrors.registros = 'Debe seleccionar al menos un registro';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejador de cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'usuario_id') {
      const trabajadorSeleccionado = trabajadores.find(t => t.id === parseInt(value));
      setPuedeSubirNotas(trabajadorSeleccionado?.subir_notas || false);
      
      setFormData({
        ...formData,
        usuario_id: value,
        categoria: '',
        cliente_id: '',
        tipo_tarea: '',
        documento_id: '',
        registros: [],
        mes: ''
      });
      setDocumentosCliente([]);
      setRegistros([]);
      setTotalRegistros(0);
      setTotalUnidades(0);
    } 
    else if (name === 'categoria') {
      setFormData({
        ...formData,
        categoria: value,
        cliente_id: '',
        tipo_tarea: '',
        documento_id: '',
        registros: [],
        mes: ''
      });
      setDocumentosCliente([]);
      setRegistros([]);
      setTotalRegistros(0);
      setTotalUnidades(0);
    } 
    else if (name === 'cliente_id') {
      setFormData({
        ...formData,
        cliente_id: value,
        tipo_tarea: '',
        documento_id: '',
        registros: [],
      });
      setRegistros([]);
      setTotalRegistros(0);
      setTotalUnidades(0);
    } 
    else if (name === 'tipo_tarea') {
      setFormData({
        ...formData,
        tipo_tarea: value,
        documento_id: '',
        registros: [],
      });
      setTotalRegistros(0);
      setTotalUnidades(0);
    } 
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Manejador para seleccionar/deseleccionar registros
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

  // Manejador para seleccionar todos los registros
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

  // Efecto para cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        // Obtener trabajadores (ordenados alfabéticamente)
        const trabajadoresResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/usuario/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const trabajadoresOrdenados = [...trabajadoresResponse.data].sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
        setTrabajadores(trabajadoresOrdenados);
        
        // Obtener clientes (ordenados alfabéticamente)
        const clientesResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/list_client/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const clientesOrdenados = [...clientesResponse.data].sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
        setClientes(clientesOrdenados);
        
        // Obtener documentos
        const documentosResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/listar_documentacion/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodosDocumentos(documentosResponse.data);

        // Obtener supervisores (ordenados alfabéticamente)
        const supervisoresResponse = await axios.get('https://sistemacontable-wico.onrender.com/api/usuario/?rol=supervisor', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const supervisoresOrdenados = [...supervisoresResponse.data].sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
        setSupervisores(supervisoresOrdenados);
        
      } catch (error) {
        toast.error('Error al cargar datos iniciales');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Efecto para cargar documentos del cliente
  useEffect(() => {
    const fetchDocumentos = async () => {
      if (!formData.cliente_id) {
        setDocumentosCliente([]);
        return;
      }
  
      try {
        setLoading(true);
        const token = getToken();
  
        // Para Open y SPR, usamos el endpoint específico list_client_document_all
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
        // Para Subir notas al Sistema y Bill, mantenemos el comportamiento actual
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
        // Para Notas (1), usamos el endpoint original
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

  // Efecto para cargar registros del documento seleccionado
  useEffect(() => {
    const fetchRegistros = async () => {
      if (!formData.documento_id || !formData.cliente_id) {
        setRegistros([]);
        setTotalRegistros(0);
        setTotalUnidades(0);
        return;
      }
      
      try {
        setLoading(true);
        const token = getToken();
  
        // Para Subir notas al Sistema y Bill, necesitamos los registros para calcular unidades
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
          
          if (docSeleccionado?.contenido_registros) {
            setRegistros(docSeleccionado.contenido_registros);
            const totalReg = docSeleccionado.contenido_registros.length;
            const totalUnid = docSeleccionado.contenido_registros.reduce(
              (sum, registro) => sum + (registro.unidades || 0), 0
            );
            setTotalRegistros(totalReg);
            setTotalUnidades(totalUnid);
          } else {
            setRegistros([]);
            setTotalRegistros(docSeleccionado?.total_registros || 0);
            setTotalUnidades(0);
          }
        } 
        // Para Open y SPR, usamos el nuevo endpoint
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
          setTotalRegistros(docSeleccionado?.contenido_registros?.length || 0);
          setTotalUnidades(0);
        }
        // Para Notas (1), mantenemos el comportamiento original
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
          setTotalRegistros(docSeleccionado?.contenido_registros?.length || 0);
          setTotalUnidades(0);
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

  // Manejador para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = getToken();
      const tipoTareaBackend = tipoTareaMapping[formData.tipo_tarea];
      
      // 1. Obtener datos del trabajador seleccionado
      const trabajadorSeleccionado = trabajadores.find(
        t => t.id === parseInt(formData.usuario_id)
      );
      
      if (!trabajadorSeleccionado) {
        throw new Error('No se encontró el trabajador seleccionado');
      }
  
      // 2. Preparar estructura principal del cobro
      const datosBase = {
        usuario_registra: trabajadorSeleccionado.id,
        cliente: parseInt(formData.cliente_id),
        documento: parseInt(formData.documento_id),
        tipo_tarea: tipoTareaBackend,
        mes: formData.mes,
        usuario_supervisor: formData.usuario_supervisor || null
      };
  
      // 3. Procesar según tipo de tarea
      if (['2', '3'].includes(formData.tipo_tarea)) {
        // Tareas de notas (Subir/Bill)
        const unidades = calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros);
        
        const response = await axios.post(
          'https://sistemacontable-wico.onrender.com/api/insertar_cobro/',
          {
            ...datosBase,
            unidades: unidades,
            contenido: []
          },
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        handleResponse(response);
        
      } else {
        // Tareas con registros (Notas, Open, SPR)
        const contenidoRegistro = formData.registros.map(id => {
          const registro = registros.find(r => r.id === id);
          const unidades = ['4', '5'].includes(formData.tipo_tarea) 
            ? unidadesPorTipoTarea[formData.tipo_tarea] 
            : registro?.unidades || 1;
          
          return {
            id: id,
            nombre_completo: registro?.nombre_completo || `Registro ${id}`,
            unidades: unidades
          };
        });
        
        const totalUnidades = contenidoRegistro.reduce((sum, reg) => sum + reg.unidades, 0);
        
        const response = await axios.post(
          'https://sistemacontable-wico.onrender.com/api/insertar_cobro/',
          {
            ...datosBase,
            unidades: totalUnidades,
            contenido: contenidoRegistro
          },
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        handleResponse(response);
      }
    } catch (error) {
      console.error("Error detallado:", error);
      toast.error(error.response?.data?.message || error.message || 'Error al registrar el cobro');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Función auxiliar para manejar la respuesta
  const handleResponse = (response) => {
    if (response.data && response.data.success) {
      toast.success('Cobro asignado correctamente al trabajador');
      setTimeout(() => navigate('/gestPago/listarPagosCobros'), 1500);
    } else {
      throw new Error(response.data?.error || 'Error en la respuesta del servidor');
    }
  };

  // Filtrar clientes por categoría seleccionada
  const clientesFiltrados = clientes.filter(cliente => 
    formData.categoria ? cliente.categoria === parseInt(formData.categoria) : true
  );

  // Filtrar documentos por tipo de tarea
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

  // Ordenar documentos alfabéticamente
  const documentosOrdenados = [...documentosFiltrados].sort((a, b) => 
    a.nombre_archivo.localeCompare(b.nombre_archivo)
  );

  return (
    <div className="container mt-4" style={{ marginBottom: '100px' }}>
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2>Asignar Pago a Trabajador</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. Selección de trabajador */}
            <div className="mb-3">
              <label className="form-label">Trabajador *</label>
              <select
                name="usuario_id"
                className={`form-select ${errors.usuario_id ? 'is-invalid' : ''}`}
                value={formData.usuario_id}
                onChange={handleChange}
                required
                disabled={loading || trabajadores.length === 0}
              >
                <option value="">Seleccione un trabajador</option>
                {trabajadores.map(trabajador => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.first_name} {trabajador.last_name}
                  </option>
                ))}
              </select>
              {errors.usuario_id && <div className="invalid-feedback">{errors.usuario_id}</div>}
            </div>

            {/* 2. Categoría */}
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

            {/* 3. Cliente */}
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

            {/* 4. Tipo de Tarea */}
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

            {/* 5. Documento */}
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
                {documentosOrdenados.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre_archivo} - {new Date(doc.fecha_creacion).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.documento_id && <div className="invalid-feedback">{errors.documento_id}</div>}
              {documentosOrdenados.length === 0 && formData.tipo_tarea && formData.cliente_id && !loading && !errors.documento_id && (
                <div className="text-danger mt-1">
                  No hay documentos disponibles para este cliente y tipo de trabajo
                </div>
              )}
            </div>

            {/* 6. Mes */}
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

            {/* 7. Supervisor (opcional) */}
            <div className="mb-3">
              <label className="form-label">Supervisor (opcional)</label>
              <select
                name="usuario_supervisor"
                className={`form-select ${errors.usuario_supervisor ? 'is-invalid' : ''}`}
                value={formData.usuario_supervisor}
                onChange={handleChange}
                disabled={loading || supervisores.length === 0}
              >
                <option value="">Sin supervisor</option>
                {supervisores.map(supervisor => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.first_name} {supervisor.last_name}
                  </option>
                ))}
              </select>
              {errors.usuario_supervisor && (
                <div className="invalid-feedback">{errors.usuario_supervisor}</div>
              )}
            </div>

            {/* 8. Info para tareas de notas (Subir/Bill) */}
            {['2', '3'].includes(formData.tipo_tarea) && formData.documento_id && (
              <div className="mb-4">
                <div className="alert alert-info">
                  {formData.tipo_tarea === '2' ? (
                    <>
                      <strong>Total de registros:</strong> {totalRegistros}
                      <br />
                      <strong>Unidades a cobrar:</strong> {calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros)} unidades 
                      {totalRegistros <= 5 ? ' (hasta 5 registros: 10 unidades)' : ' (6 o más registros: 20 unidades)'}
                    </>
                  ) : (
                    <>
                      <strong>Total de unidades en registros:</strong> {totalUnidades}u
                      <br />
                      <strong>Unidades a cobrar:</strong> {calcularUnidadesNotas(formData.tipo_tarea, totalRegistros, registros)}u
                      <br />
                      <strong>Cálculo:</strong> {calcularUnidadesBill(totalUnidades)}u 
                      <br />
                      <small>
                        Rangos: 0-40u:10u | 41-75u:20u | 76-100u:30u | 101-160u:40u | 161-194u:50u | ≥195u:60u
                      </small>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 9. Info para Open/SPR */}
            {['4', '5'].includes(formData.tipo_tarea) && formData.documento_id && (
              <div className="mb-2">
                <div className="alert alert-info">
                  <strong>Información de unidades:</strong>
                  {formData.tipo_tarea === '4' && ' Para cada registro seleccionado, se aplicarán 50 unidades (Open)'}
                  {formData.tipo_tarea === '5' && ' Para cada registro seleccionado, se aplicarán 25 unidades (SPR)'}
                </div>
              </div>
            )}

            {/* 10. Selección de Registros (Notas/Open/SPR) */}
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
                onClick={() => navigate('/gestCobro/listarPagosCobros')}
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
                    Asignando...
                  </>
                ) : 'Asignar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default InsertarPagoCobros;
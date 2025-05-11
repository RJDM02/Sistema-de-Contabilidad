import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    password: '' // Solo la nueva contraseña
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem('auth');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validaciones
    if (formData.password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth');
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Configuración de Axios con interceptor
      const api = axios.create({
        baseURL: 'https://sistemacontable-wico.onrender.com/api/',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      // Verificar token primero
      try {
        await api.get('verify-token/');
      } catch (verifyError) {
        if (verifyError.response?.status === 401) {
          localStorage.removeItem('auth');
          navigate('/login');
          return;
        }
      }

      // Enviar solo la nueva contraseña
      await api.put('update_password/', { password: formData.password });

      setSuccess(true);
      setTimeout(() => navigate('/home'), 2000);
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      
      if (error.response?.status === 401) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        localStorage.removeItem('auth');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(
          error.response?.data?.message || 
          error.response?.data?.detail || 
          'Error al cambiar la contraseña. Verifica los datos e intenta nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4">Cambiar Contraseña</h2>
              
              {success ? (
                <div className="alert alert-success text-center">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Contraseña cambiada exitosamente
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {error}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label htmlFor="currentPassword" className="form-label">
                      Contraseña Actual*
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">
                      Nueva Contraseña*
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      value={formData.password}
                      onChange={(e) => setFormData({ password: e.target.value })}
                      required
                      minLength="8"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirmar Contraseña*
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength="8"
                    />
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Cambiando...
                        </>
                      ) : 'Cambiar Contraseña'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
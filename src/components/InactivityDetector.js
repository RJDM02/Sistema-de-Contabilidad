import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './InactivityDetector.css';

const InactivityDetector = ({ children, inactivityTime = 1, warningTime = 0.5 }) => {
  const navigate = useNavigate();
  const [remainingTime, setRemainingTime] = useState(null);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const timers = useRef({
    logoutTimer: null,
    warningTimer: null,
    countdown: null
  });

  const resetTimers = () => {
    // Limpiar timers existentes
    clearTimeout(timers.current.logoutTimer);
    clearTimeout(timers.current.warningTimer);
    clearInterval(timers.current.countdown);
    setIsWarningVisible(false);
    setRemainingTime(null);

    // Configurar nuevo timer de advertencia
    timers.current.warningTimer = setTimeout(() => {
      setIsWarningVisible(true);
      startCountdown();
    }, (inactivityTime - warningTime) * 60 * 1000);

    // Configurar nuevo timer de logout
    timers.current.logoutTimer = setTimeout(() => {
      handleLogout();
    }, inactivityTime * 60 * 1000);
  };

  const startCountdown = () => {
    const endTime = Date.now() + warningTime * 60 * 1000;
    timers.current.countdown = setInterval(() => {
      const secondsLeft = Math.round((endTime - Date.now()) / 1000);
      setRemainingTime(secondsLeft > 0 ? secondsLeft : 0);
      
      if (secondsLeft <= 0) {
        clearInterval(timers.current.countdown);
        handleLogout();
      }
    }, 1000);
  };

  const handleLogout = () => {
    // Limpiar todos los timers
    clearTimeout(timers.current.logoutTimer);
    clearTimeout(timers.current.warningTimer);
    clearInterval(timers.current.countdown);
    
    // Limpiar datos de sesión
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Redirigir al login
    navigate("/");
    window.location.reload(); // Forzar recarga para limpiar el estado
  };

  const handleContinueSession = () => {
    resetTimers();
  };

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 'scroll',
      'touchstart', 'click', 'keypress', 'input',
      'wheel', 'resize', 'focus'
    ];

    // Agregar event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimers);
    });

    // Iniciar timers
    resetTimers();

    // Limpieza al desmontar
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
      clearTimeout(timers.current.logoutTimer);
      clearTimeout(timers.current.warningTimer);
      clearInterval(timers.current.countdown);
    };
  }, [navigate]);

  return (
    <>
      {isWarningVisible && (
        <div className="inactivity-warning-overlay">
          <div className="inactivity-warning-modal">
            <h3>Sesión por expirar</h3>
            <p>
              Tu sesión se cerrará automáticamente en {remainingTime} segundos por inactividad.
            </p>
            <div className="warning-actions">
              <button 
                className="warning-button continue-btn"
                onClick={handleContinueSession}
              >
                Continuar sesión
              </button>
              <button 
                className="warning-button logout-btn"
                onClick={handleLogout}
              >
                Cerrar sesión ahora
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default InactivityDetector;
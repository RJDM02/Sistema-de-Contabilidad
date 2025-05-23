import React, { useEffect, useState, useRef } from 'react';
import './InactivityDetector.css';

const InactivityDetector = ({ 
  children, 
  onLogout, 
  inactivityTime = 5, // minutos
  warningTime = 1, // minutos
  showWarning = true 
}) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const timers = useRef({
    inactivityTimer: null,
    warningTimer: null,
    intervalTimer: null
  });

  // Convertir minutos a milisegundos
  const totalInactivityMs = inactivityTime * 60 * 1000;
  const warningTimeMs = warningTime * 60 * 1000;

  const startTimers = () => {
    // Limpiar timers existentes
    clearTimeout(timers.current.inactivityTimer);
    clearTimeout(timers.current.warningTimer);
    clearInterval(timers.current.intervalTimer);
    setIsWarningVisible(false);
    setRemainingTime(null);

    // Timer para mostrar advertencia
    if (showWarning) {
      timers.current.warningTimer = setTimeout(() => {
        setIsWarningVisible(true);
        startCountdown();
      }, totalInactivityMs - warningTimeMs);
    }

    // Timer para cerrar sesión
    timers.current.inactivityTimer = setTimeout(() => {
      onLogout();
    }, totalInactivityMs);
  };

  const startCountdown = () => {
    const endTime = Date.now() + warningTimeMs;
    timers.current.intervalTimer = setInterval(() => {
      const timeLeft = Math.round((endTime - Date.now()) / 1000);
      setRemainingTime(timeLeft > 0 ? timeLeft : 0);
      
      if (timeLeft <= 0) {
        clearInterval(timers.current.intervalTimer);
      }
    }, 1000);
  };

  const resetTimers = () => {
    startTimers();
  };

  const handleStayLoggedIn = () => {
    resetTimers();
  };

  // Limpiar todos los timers
  const clearAllTimers = () => {
    clearTimeout(timers.current.inactivityTimer);
    clearTimeout(timers.current.warningTimer);
    clearInterval(timers.current.intervalTimer);
  };

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const events = [
      'mousedown', 'mousemove', 'keydown', 
      'scroll', 'touchstart', 'click',
      'keypress', 'input'
    ];

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimers);
    });

    // Iniciar timers
    startTimers();

    // Limpieza
    return () => {
      clearAllTimers();
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [onLogout]);

  // Exportar función para limpiar timers manualmente
  useEffect(() => {
    window.clearInactivityTimers = clearAllTimers;
    return () => {
      delete window.clearInactivityTimers;
    };
  }, []);

  return (
    <>
      {isWarningVisible && (
        <div className="inactivity-warning-overlay">
          <div className="inactivity-warning-modal">
            <h3>Sesión por expirar</h3>
            <p>
              Tu sesión se cerrará automáticamente por inactividad en {remainingTime} segundos.
            </p>
            <div className="warning-actions">
              <button 
                className="warning-button continue-btn"
                onClick={handleStayLoggedIn}
              >
                Continuar sesión
              </button>
              <button 
                className="warning-button logout-btn"
                onClick={onLogout}
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
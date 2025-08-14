// БЕЗОПАСНАЯ СИСТЕМА ЛОГИРОВАНИЯ для production
// Предотвращает утечку информации через console.log в production

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment || isTest) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment || isTest) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment || isTest) {
      console.error(...args);
    }
    // В production логируем только критические ошибки без деталей
    else {
      console.error('Произошла ошибка. Обратитесь к администратору.');
    }
  },
  
  // Метод для отладки - работает только в development
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  }
};

// Безопасная функция для отображения ошибок пользователю
export const getUserFriendlyError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    // Не показываем технические детали в production
    if (!isDevelopment) {
      // Проверяем на популярные пользовательские ошибки
      const message = error.message.toLowerCase();
      if (message.includes('network') || message.includes('fetch')) {
        return 'Проблема с подключением к интернету';
      }
      if (message.includes('timeout')) {
        return 'Время ожидания истекло';
      }
      if (message.includes('unauthorized') || message.includes('forbidden')) {
        return 'Недостаточно прав доступа';
      }
      return 'Произошла ошибка. Попробуйте позже.';
    }
    return error.message;
  }
  
  return 'Неизвестная ошибка';
};
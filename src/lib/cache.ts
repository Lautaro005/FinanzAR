export const cacheData = <T>(key: string, data: T): void => {
  try {
    const item = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`finanzar_${key}`, JSON.stringify(item));
  } catch (e) {
    console.warn(`[FinanzAR Cache] Error guardando en cache: ${key}`, e);
  }
};

export const getCachedData = <T>(key: string, ttlMin = 10): T | null => {
  try {
    const itemStr = localStorage.getItem(`finanzar_${key}`);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    const now = Date.now();
    if (now - item.timestamp > ttlMin * 60 * 1000) {
      localStorage.removeItem(`finanzar_${key}`);
      return null;
    }
    return item.data as T;
  } catch (e) {
    console.warn(`[FinanzAR Cache] Error leyendo cache: ${key}`, e);
    return null;
  }
};

export const clearCache = (key?: string): void => {
  try {
    if (key) {
      localStorage.removeItem(`finanzar_${key}`);
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("finanzar_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn("[FinanzAR Cache] Error limpiando cache", e);
  }
};

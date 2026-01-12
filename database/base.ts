
export const mapDoc = (doc: any) => {
  if (!doc) return null;
  return typeof doc.data === 'function' 
    ? cleanupData({ id: doc.id, ...doc.data() }) 
    : cleanupData(doc);
};

export const cleanupData = (data: any, seen = new WeakSet()): any => {
  if (data === null || data === undefined || typeof data !== 'object') return data;
  if (seen.has(data)) return "[Circular]";

  // Loại bỏ các đối tượng nội bộ của Firebase để an toàn cho JSON stringify
  const cName = data?.constructor?.name;
  if (cName && (cName.includes('Firestore') || cName.includes('Reference') || cName.includes('Snapshot'))) {
    return null;
  }

  if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
    return { seconds: data.seconds, nanoseconds: data.nanoseconds };
  }

  if (Array.isArray(data)) {
    seen.add(data);
    return data.map(item => cleanupData(item, seen)).filter(i => i !== null);
  }

  seen.add(data);
  const clean: any = {};
  Object.keys(data).forEach(key => {
    const val = data[key];
    if (val !== undefined && typeof val !== 'function') {
      const cleanedVal = cleanupData(val, seen);
      if (cleanedVal !== undefined) clean[key] = cleanedVal;
    }
  });
  
  return clean;
};

export const withTimestamp = (data: any, isNew = false) => {
  const now = Date.now();
  const base = cleanupData(data) || {};
  return {
    ...base,
    updatedAt: now,
    ...(isNew ? { createdAt: now, isActive: true } : {})
  };
};

export const getCurrentUserSync = () => {
  try {
    const userStr = localStorage.getItem('vietpos_session_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    localStorage.removeItem('vietpos_session_user');
    return null;
  }
};

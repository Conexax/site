import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export const useAuditLog = () => {
  const logAction = async (action, entityType = null, entityId = null, entityName = null, beforeData = null, afterData = null, metadata = null) => {
    try {
      await base44.functions.invoke('registerAuditLog', {
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        before_snapshot: beforeData,
        after_snapshot: afterData,
        result: 'success',
        metadata
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};

export const AuditPageView = ({ pageName }) => {
  const hasLogged = useRef(false);

  useEffect(() => {
    if (hasLogged.current) return;
    hasLogged.current = true;

    const logPageView = async () => {
      try {
        await base44.functions.invoke('registerAuditLog', {
          action: 'VIEW_PAGE',
          entity_type: 'Page',
          entity_name: pageName,
          result: 'success',
          metadata: { page: pageName }
        });
      } catch (error) {
        console.error('Failed to log page view:', error);
      }
    };

    logPageView();
  }, [pageName]);

  return null;
};
import { useEffect, useRef } from 'react';
import socket from '../api/websocket';
import { useAppDispatch } from '../hooks';
import { updateWidgetData } from '../store/dashboardSlice';

export interface WidgetSocketMessage {
  widget_id: string;
  data?: import('../types').QueryResult;
  error?: string;
}

/**
 * Subscribes to per-widget scheduler updates. The editor reads from Redux, so
 * the default path always dispatches there. Pages that keep data in local state
 * (the viewer) can pass `onWidgetData` and update their own copy as well.
 */
export const useDashboardSocket = (
  dashboardId: string | undefined,
  onWidgetData?: (message: WidgetSocketMessage) => void,
) => {
  const dispatch = useAppDispatch();
  const handlerRef = useRef(onWidgetData);

  useEffect(() => {
    handlerRef.current = onWidgetData;
  }, [onWidgetData]);

  useEffect(() => {
    if (!dashboardId) return;
    socket.connect(dashboardId);
    const unsubscribe = socket.onMessage((msg) => {
      if (msg.type === 'widget_data') {
        dispatch(updateWidgetData({
          widget_id: msg.widget_id,
          data: msg.data,
          error: msg.error,
        }));
        handlerRef.current?.({
          widget_id: msg.widget_id,
          data: msg.data,
          error: msg.error,
        });
      }
    });
    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [dashboardId, dispatch]);
};

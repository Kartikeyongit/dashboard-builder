import { useEffect } from 'react';
import socket from '../api/websocket';
import { useAppDispatch } from '../hooks';
import { updateWidgetData } from '../store/dashboardSlice';

export const useDashboardSocket = (dashboardId: string | undefined) => {
  const dispatch = useAppDispatch();

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
      }
    });
    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [dashboardId, dispatch]);
};
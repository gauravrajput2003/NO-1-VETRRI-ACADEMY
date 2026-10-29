import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
export default function NotificationAcknowledgement() {
  const { user } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  useEffect(() => {
    const query = new URLSearchParams(location.search); const id = query.get('notificationId');
    if (!user || !id || !/^[a-f0-9]{24}$/i.test(id)) return;
    api.patch(`/notifications/${id}/read`).then(() => {
      query.delete('notificationId'); const suffix = query.toString(); navigate(`${location.pathname}${suffix ? `?${suffix}` : ''}`, { replace: true });
    }).catch(() => {});
  }, [user?._id, location.pathname, location.search, navigate]);
  return null;
}

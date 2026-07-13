import api, { unwrap } from '../services/api';
import { ENDPOINTS } from '../services/endpoints';
import { uiActions, notificationActions } from './reducers';

export const { toggleSidebar, setSidebar, showSnackbar, hideSnackbar } = uiActions;
export const { setNotifications, clearNotifications } = notificationActions;

/** Thunk: load recent notification deliveries from the notification-service. */
export const fetchNotifications =
  (limit = 20) =>
  async (dispatch) => {
    try {
      const res = await api.get(ENDPOINTS.notifications.recent, { params: { limit } });
      dispatch(setNotifications(unwrap(res) || []));
    } catch {
      // Notifications are non-critical; ignore failures silently.
    }
  };

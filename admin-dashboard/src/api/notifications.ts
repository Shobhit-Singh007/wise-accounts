import client from './client';

export interface Notification {
  id: string;
  businessId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const notificationsApi = {
  getAll: (businessId: string, params?: { page?: number; limit?: number }) =>
    client.get<{ data: Notification[]; meta: { total: number } }>(
      `${prefix(businessId)}/notifications`,
      { params },
    ),

  markRead: (businessId: string, notificationId: string) =>
    client.put(`${prefix(businessId)}/notifications/${notificationId}/read`),

  markAllRead: (businessId: string) =>
    client.put(`${prefix(businessId)}/notifications/read-all`),

  unreadCount: (businessId: string) =>
    client.get<{ count: number }>(`${prefix(businessId)}/notifications/unread-count`),
};

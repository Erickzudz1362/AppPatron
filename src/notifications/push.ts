import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { IosAuthorizationStatus } from 'expo-notifications/build/NotificationPermissions.types';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import getAllScheduledNotificationsAsync from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await getPermissionsAsync();
  if (current.granted || current.ios?.status === IosAuthorizationStatus.PROVISIONAL) return true;
  const request = await requestPermissionsAsync();
  return !!(request.granted || request.ios?.status === IosAuthorizationStatus.PROVISIONAL);
}

export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android' && isRunningInExpoGo()) return null;

  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('default', {
      name: 'General',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00A9B9',
    });
  }

  const { default: getExpoPushTokenAsync } = await import('expo-notifications/build/getExpoPushTokenAsync');
  const token = await getExpoPushTokenAsync();
  return token.data ?? null;
}

export async function showLocalNoticeNotification(title: string, body: string): Promise<void> {
  await scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function scheduleClientAppointmentReminder(params: {
  appointmentId: string;
  at: Date;
  barberName: string;
  servicesLabel: string;
}): Promise<void> {
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  for (const minutes of [60, 30]) {
    const fire = new Date(params.at.getTime() - minutes * 60 * 1000);
    if (fire.getTime() <= Date.now() + 10_000) continue;
    await scheduleNotificationAsync({
      content: {
        title: 'Tu cita es pronto',
        body: `En ${minutes} min: ${params.servicesLabel} con ${params.barberName}.`,
        sound: true,
        data: { kind: 'client_appt_reminder', appointmentId: params.appointmentId, minutes },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: fire },
    });
  }
}

type StaffReminderRow = {
  id: string;
  date: string;
  time: string;
  status: string;
};

export async function syncStaffAppointmentReminders(rows: StaffReminderRow[]): Promise<void> {
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  const scheduled = await getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((row) => (row.content.data as Record<string, unknown> | undefined)?.kind === 'staff_appt_reminder')
      .map((row) => cancelScheduledNotificationAsync(row.identifier))
  );

  const now = Date.now();
  for (const row of rows) {
    if (!['pending', 'confirmed'].includes(row.status)) continue;
    const t = (row.time ?? '10:00').slice(0, 5);
    const start = new Date(`${row.date}T${t}:00`);
    if (Number.isNaN(start.getTime())) continue;

    for (const minutes of [60, 30]) {
      const fire = new Date(start.getTime() - minutes * 60 * 1000);
      if (fire.getTime() <= now + 15_000) continue;
      await scheduleNotificationAsync({
        content: {
          title: `Cita en ${minutes} minutos`,
          body: `Reserva ${row.id.slice(0, 8)} · ${row.date} ${t}`,
          sound: true,
          data: { kind: 'staff_appt_reminder', appointmentId: row.id, minutes },
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: fire },
      });
    }
  }
}

'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  role_target: string;
  link: string | null;
  created_at: string;
}

export async function getNotificationsAction(): Promise<AppNotification[]> {
  try {
    const cookieStore = cookies();
    const userRole = cookieStore.get('user_role')?.value || 'editor';

    // Fetch notifications where role_target is 'all' or matches the user's role
    const { data, error } = await supabase
      .from('system_notifications')
      .select('*')
      .in('role_target', ['all', userRole])
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data as AppNotification[];
  } catch (err) {
    console.error('Exception fetching notifications:', err);
    return [];
  }
}

// Internal server-side function to create a notification (not exported as an action for clients to call directly for security, used by other actions)
export async function createNotification(title: string, message: string, role_target: 'admin' | 'editor' | 'all', link?: string) {
  try {
    const { error } = await supabase
      .from('system_notifications')
      .insert([
        {
          title,
          message,
          role_target,
          link: link || null
        }
      ]);

    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (err) {
    console.error('Exception creating notification:', err);
  }
}

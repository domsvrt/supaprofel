import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { role } = useAuth();

  if (role === 'teacher') return <Redirect href="/teacher" />;
  if (role === 'student') return <Redirect href="/student" />;
  return <Redirect href="/sign-in" />;
}

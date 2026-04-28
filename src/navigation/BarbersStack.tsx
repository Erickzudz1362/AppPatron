import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../theme/ThemeProvider';
import BarbersScreen from '../screens/barbers/BarbersScreen';
import BarberCalendarScreen from '../screens/barbers/BarberCalendarScreen';
import BookingSummaryScreen from '../screens/barbers/BookingSummaryScreen';
import BookingSuccessScreen from '../screens/barbers/BookingSuccessScreen';

const Stack = createNativeStackNavigator();

export default function BarbersStackNavigator() {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="BarbersList" component={BarbersScreen} />
      <Stack.Screen name="BarberCalendar" component={BarberCalendarScreen} />
      <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
    </Stack.Navigator>
  );
}


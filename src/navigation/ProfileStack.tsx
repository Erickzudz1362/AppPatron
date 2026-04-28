import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import QrPaymentScreen from '../screens/profile/QrPaymentScreen';
import LegalDocumentScreen, { type LegalDocType } from '../screens/profile/LegalDocumentScreen';
import DeleteAccountScreen from '../screens/profile/DeleteAccountScreen';
import { useAppTheme } from '../theme/ThemeProvider';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  QrPayment: undefined;
  LegalDocument: { document: LegalDocType };
  DeleteAccount: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="QrPayment" component={QrPaymentScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </Stack.Navigator>
  );
}

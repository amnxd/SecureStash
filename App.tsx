import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import { StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Enable screens for better performance
enableScreens();
 

// Import screens
import SignupScreen from "./Screens/SignupScreen";
import LoginScreen from "./Screens/LoginScreen";
import Home from "./Screens/HomeScreen";
import BinScreen from "./Screens/BinScreen";
import UploadsScreen from "./Screens/UploadsScreen";
import SettingsScreen from "./Screens/SettingsScreen";
import HelpFeedbackScreen from "./Screens/HelpFeedbackScreen";

export type RootStackParamList = {
  Signup: undefined;
  Login: undefined;
  Home: undefined;
  Uploads: undefined;
  Bin: undefined;
  Settings: undefined;
  HelpFeedback: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* You can add a loading spinner here */}
      </View>
    );
  }

  const initialRouteName: keyof RootStackParamList = user ? "Home" : "Login";

  return (
    <NavigationContainer>
      <Stack.Navigator 
        id={undefined}
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {user ? (
          // Authenticated user screens
          <>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Uploads" component={UploadsScreen} />
            <Stack.Screen name="Bin" component={BinScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="HelpFeedback" component={HelpFeedbackScreen} />
          </>
        ) : (
          // Unauthenticated user screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
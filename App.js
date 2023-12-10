import { useState, useEffect, useRef } from 'react';
import { Text, View, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { StyleSheet } from 'react-native';
import Constants from "expo-constants";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    })).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [isTokenReady, setIsTokenReady] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const webViewRef = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      setIsTokenReady(true);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const handleWebViewLoadEnd = () => {
    const injectScript = `
    //const pushTokenElement = document.querySelector('#push-token');
    if (pushTokenElement)
      pushTokenElement.value = '${expoPushToken}';
    `;

    webViewRef.current.injectJavaScript(injectScript);
  };

  return (
    <View style={{flex: 1}}>
      <StatusBar backgroundColor="#008000" barStyle="dark-content" />
      {isTokenReady ? (
        <WebView
        ref={webViewRef}
        source={{ uri: 'http://192.168.11.18:8080/signup' }}
        onLoadEnd={handleWebViewLoadEnd}
        />
      ) : (
        <ActivityIndicator size="large" />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href='/(tabs)/home' style={styles.link}>
          Go to Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1117',
    padding: 24,
  },
  title: {
    fontSize: 20,
    color: '#F9FAFB',
    marginBottom: 12,
    fontWeight: '600',
  },
  link: {
    color: '#2ECC71',
    fontSize: 16,
  },
});

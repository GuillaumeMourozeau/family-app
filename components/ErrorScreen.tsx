import { ScrollView, StyleSheet, Text } from "react-native";

export function ErrorScreen({ error }: { error: Error }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      {error.stack && <Text style={styles.stack}>{error.stack}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: "700", color: "#ef4444", marginBottom: 12 },
  message: { fontSize: 15, marginBottom: 12 },
  stack: { fontSize: 11, color: "#888" },
});

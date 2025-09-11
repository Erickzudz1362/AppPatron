import { StyleSheet } from "react-native";

export const ButtonStyles = StyleSheet.create({
  base: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primary: {
    backgroundColor: "#00A9B9", // 👈 TURQUESA actual
  },
  secondary: {
    backgroundColor: "#FFD700", // Amarillo opcional
  },
  danger: {
    backgroundColor: "#E63946", // Rojo para errores
  },
  textLight: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  textDark: {
    color: "#111",
    fontSize: 16,
    fontWeight: "500",
  },
});

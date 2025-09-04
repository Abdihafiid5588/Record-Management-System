import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1E3A8A", // deep blue
    },
    secondary: {
      main: "#1E3A8A", // orange accent
    },
    background: {
      default: "#1E3A8A",
    },
  },
  typography: {
    fontFamily: "Poppins, Inter, sans-serif",
  },
});

export default theme;

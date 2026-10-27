import LocalLaundryServiceRounded from "@mui/icons-material/LocalLaundryServiceRounded";
import Box from "@mui/material/Box";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 1.5,
        color: "#fff",
        background: "linear-gradient(135deg, #5BE49B 0%, #00A76F 55%, #007867 100%)",
        boxShadow: "0 8px 16px 0 rgba(0, 167, 111, 0.24)",
      }}
    >
      <LocalLaundryServiceRounded sx={{ fontSize: size * 0.6 }} />
    </Box>
  );
}

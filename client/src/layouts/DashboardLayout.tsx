import FacebookIcon from "@mui/icons-material/Facebook";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CampaignIcon from "@mui/icons-material/Campaign";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useThemeMode } from "../theme/ThemeModeContext";

const drawerWidth = 260;

const items: { to: string; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/clients", label: "Klienci", icon: <PeopleIcon /> },
  { to: "/marketing", label: "Reklamy (Marketing API)", icon: <CampaignIcon /> },
  { to: "/ad-spend", label: "Ad Spend Overview", icon: <ShowChartIcon /> },
  { to: "/settings", label: "Ustawienia", icon: <SettingsIcon /> },
  { to: "/administration", label: "Administracja", icon: <AdminPanelSettingsIcon />, adminOnly: true },
];

export function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1 }}>
        <FacebookIcon color="primary" />
        <Typography variant="h6" noWrap>
          Social Mgmt
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {items
          .filter((x) => !x.adminOnly || user?.role === "ADMINISTRATOR")
          .map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  borderRight: 3,
                  borderColor: "primary.main",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {user?.email}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.role === "ADMINISTRATOR" ? "Administrator" : "Marketing"}
        </Typography>
        <Typography
          component="button"
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          sx={{
            display: "block",
            mt: 1,
            border: "none",
            background: "none",
            color: "primary.main",
            cursor: "pointer",
            p: 0,
            font: "inherit",
            textDecoration: "underline",
          }}
        >
          Wyloguj
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Panel administracyjny
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mode === "dark"}
                onChange={() => toggleMode()}
                color="default"
                icon={<LightModeIcon fontSize="small" />}
                checkedIcon={<DarkModeIcon fontSize="small" />}
              />
            }
            label={mode === "dark" ? "Ciemny" : "Jasny"}
            sx={{ mr: 0, ml: 1 }}
          />
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

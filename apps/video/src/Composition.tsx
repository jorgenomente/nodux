import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const bgStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 15% 20%, #ffcf66 0%, #f28d35 28%, #131f3a 62%, #080d19 100%)",
};

const phoneShell: React.CSSProperties = {
  width: 600,
  height: 1240,
  borderRadius: 68,
  padding: 20,
  background: "#0f172a",
  border: "2px solid rgba(255,255,255,0.08)",
  boxShadow: "0 36px 90px rgba(0,0,0,0.45)",
};

const phoneScreen: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: 52,
  overflow: "hidden",
  background: "#f8fafc",
  border: "1px solid rgba(15,23,42,0.08)",
};

const screenFrame: React.CSSProperties = {
  width: "100%",
  height: "100%",
  padding: "110px 36px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  boxSizing: "border-box",
  color: "#0f172a",
  fontFamily:
    "'Avenir Next', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardBase: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: "16px 18px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  border: "1px solid rgba(15,23,42,0.06)",
};

const chip = (label: string, selected: boolean): React.CSSProperties => ({
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 20,
  fontWeight: 700,
  color: selected ? "#0b1224" : "#475569",
  background: selected ? "#f8c75c" : "#e2e8f0",
});

const badge = (label: string): React.CSSProperties => {
  const map: Record<string, { bg: string; fg: string }> = {
    sent: { bg: "#dbeafe", fg: "#1d4ed8" },
    critical: { bg: "#fee2e2", fg: "#b91c1c" },
    warning: { bg: "#fef3c7", fg: "#a16207" },
    overdue: { bg: "#fecaca", fg: "#991b1b" },
  };
  const pick = map[label] ?? { bg: "#e2e8f0", fg: "#334155" };
  return {
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 17,
    fontWeight: 700,
    background: pick.bg,
    color: pick.fg,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };
};

const HeaderBar: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 20, color: "#475569", fontWeight: 600 }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "#dbeafe",
          border: "1px solid #bfdbfe",
        }}
      />
    </div>
  );
};

const DashboardMobile: React.FC = () => {
  return (
    <div style={screenFrame}>
      <HeaderBar title="Dashboard" subtitle="Sucursal A | Hoy" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={cardBase}>
          <div style={{ fontSize: 17, color: "#64748b", fontWeight: 700 }}>Ventas hoy</div>
          <div style={{ marginTop: 8, fontSize: 29, fontWeight: 800 }}>$428.300</div>
          <div style={{ marginTop: 6, fontSize: 16, color: "#475569" }}>26 ventas</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 17, color: "#64748b", fontWeight: 700 }}>Efectivo hoy</div>
          <div style={{ marginTop: 8, fontSize: 29, fontWeight: 800 }}>$162.900</div>
          <div style={{ marginTop: 6, fontSize: 16, color: "#475569" }}>11 ventas cash</div>
        </div>
      </div>
      <div style={cardBase}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Alertas criticas</div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Vencimientos 0-3 dias</div>
          <div style={badge("critical")}>2</div>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Pedidos por recibir</div>
          <div style={badge("warning")}>3</div>
        </div>
      </div>
      <div style={cardBase}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Operacion compras y pagos</div>
        <div style={{ marginTop: 10, fontSize: 19, color: "#1e293b" }}>Pedidos a realizar: 4</div>
        <div style={{ marginTop: 6, fontSize: 19, color: "#1e293b" }}>Pagos transfer: $98.000</div>
        <div style={{ marginTop: 6, fontSize: 19, color: "#1e293b" }}>Pagos efectivo: $94.000</div>
      </div>
    </div>
  );
};

const ExpirationsMobile: React.FC = () => {
  return (
    <div style={screenFrame}>
      <HeaderBar title="Vencimientos" subtitle="Sucursal A | Filtro critico" />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={chip("Vencidos", false)}>Vencidos</div>
        <div style={chip("0-3 dias", true)}>0-3 dias</div>
        <div style={chip("4-7 dias", false)}>4-7 dias</div>
      </div>
      <div style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800 }}>Yogur Natural 1L</div>
            <div style={{ marginTop: 6, fontSize: 18, color: "#475569" }}>Batch LP-20260223-003</div>
          </div>
          <div style={badge("critical")}>2 dias</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 18 }}>Cantidad: 18 u</div>
      </div>
      <div style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800 }}>Queso Cremoso 500g</div>
            <div style={{ marginTop: 6, fontSize: 18, color: "#475569" }}>Batch LF-20260220-002</div>
          </div>
          <div style={badge("warning")}>4 dias</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 18 }}>Cantidad: 9 u</div>
      </div>
      <div style={cardBase}>
        <div style={{ fontSize: 21, fontWeight: 800 }}>Desperdicio hoy</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color: "#b91c1c" }}>
          $24.600
        </div>
        <div style={{ marginTop: 6, fontSize: 18, color: "#475569" }}>3 movimientos registrados</div>
      </div>
    </div>
  );
};

const OrdersMobile: React.FC = () => {
  return (
    <div style={screenFrame}>
      <HeaderBar title="Pedidos" subtitle="Sucursal A | Pendientes" />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={chip("Pendientes", true)}>Pendientes</div>
        <div style={chip("Controlados", false)}>Controlados</div>
      </div>
      <div style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 23, fontWeight: 800 }}>Lacteos del Valle</div>
          <div style={badge("sent")}>sent</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 18, color: "#334155" }}>Orden #A312 | 12 items</div>
        <div style={{ marginTop: 4, fontSize: 18, color: "#334155" }}>Monto estimado: $188.000</div>
        <div style={{ marginTop: 4, fontSize: 18, color: "#334155" }}>
          Vence pago: 2026-03-03
        </div>
      </div>
      <div style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 23, fontWeight: 800 }}>Frutas San Juan</div>
          <div style={badge("overdue")}>atrasado</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 18, color: "#334155" }}>Orden #B984 | 9 items</div>
        <div style={{ marginTop: 4, fontSize: 18, color: "#334155" }}>Recepcion estimada vencida</div>
      </div>
      <div style={cardBase}>
        <div style={{ fontSize: 21, fontWeight: 800 }}>Pedidos especiales pendientes</div>
        <div style={{ marginTop: 8, fontSize: 18, color: "#334155" }}>
          5 items de clientes para agregar al pedido
        </div>
      </div>
    </div>
  );
};

const MobilePhone: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={phoneShell}>
      <div style={phoneScreen}>
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 180,
            height: 34,
            borderRadius: 18,
            background: "#0f172a",
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
};

type SceneProps = {
  start: number;
  duration: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const Scene: React.FC<SceneProps> = ({ start, duration, title, subtitle, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - start;

  const opacityIn = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacityOut = interpolate(localFrame, [duration - 15, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const slideY = interpolate(localFrame, [0, 12], [70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scaleAnim = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 16,
      stiffness: 110,
    },
  });
  const scale = interpolate(scaleAnim, [0, 1], [0.93, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: opacityIn * opacityOut,
        transform: `translateY(${slideY}px) scale(${scale})`,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 190,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 84,
          textAlign: "center",
          color: "#fff",
          textShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 0.4 }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: 30, fontWeight: 600, opacity: 0.92 }}>
          {subtitle}
        </div>
      </div>
      <MobilePhone>{children}</MobilePhone>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const introFadeOut = interpolate(frame, [24, 32], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const introScale = interpolate(frame, [0, 26], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const pulse = 1 + Math.sin((frame / fps) * 2.4) * 0.015;

  return (
    <AbsoluteFill style={bgStyle}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 80% 12%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 45%)",
          transform: `scale(${pulse})`,
        }}
      />

      <AbsoluteFill
        style={{
          opacity: introOpacity * introFadeOut,
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          textAlign: "center",
          transform: `scale(${introScale})`,
          textShadow: "0 12px 36px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900 }}>NODUX Mobile Ops</div>
        <div style={{ marginTop: 18, fontSize: 34, fontWeight: 600, opacity: 0.95 }}>
          Dashboard | Vencimientos | Pedidos
        </div>
        <div style={{ marginTop: 20, fontSize: 27, fontWeight: 500, opacity: 0.88 }}>
          1080x1920 | 30fps | 10s
        </div>
      </AbsoluteFill>

      <Scene start={30} duration={90} title="Dashboard" subtitle="KPI + alertas accionables">
        <DashboardMobile />
      </Scene>
      <Scene start={120} duration={90} title="Vencimientos" subtitle="Prioridad por severidad">
        <ExpirationsMobile />
      </Scene>
      <Scene start={210} duration={90} title="Pedidos" subtitle="Pendientes y control operativo">
        <OrdersMobile />
      </Scene>
    </AbsoluteFill>
  );
};

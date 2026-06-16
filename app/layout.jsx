import "./theme.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata = {
  title: "NESR · IT Application Registry",
  description: "The single source of truth for every NESR IT application.",
  icons: { icon: "/icon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

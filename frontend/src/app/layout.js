import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata = {
  title: "SrijanSetu",
  description: "From Thought To Creation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

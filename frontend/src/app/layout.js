import "./globals.css";

export const metadata = {
  title: "Agent Jury — AI-Powered Idea Evaluator",
  description: "Submit your project idea to a panel of 3 AI agents. Get scored on feasibility, innovation, and risk. Save your verdict on-chain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

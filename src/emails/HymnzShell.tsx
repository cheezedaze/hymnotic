import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hymnz.com";

// HYMNZ brand tokens (mirror of @theme in globals.css)
export const tokens = {
  midnight: "#141A24",
  surface: "#1E2636",
  accent: "#00FFFB",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.70)",
  textMuted: "rgba(255, 255, 255, 0.50)",
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

interface HymnzShellProps {
  /** Inbox preview text (the snippet shown next to the subject). */
  preview: string;
  children: React.ReactNode;
}

/**
 * The branded HYMNZ email chrome: logo, wordmark, and footer wrapped around
 * arbitrary campaign content. Source of truth for every HYMNZ email — keep all
 * brand styling here so individual campaigns only supply their body content.
 */
export function HymnzShell({ preview, children }: HymnzShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${baseUrl}/images/hymnz-logo1.png`}
              width="140"
              height="auto"
              alt="HYMNZ"
              style={logo}
            />
          </Section>

          <Section style={wordmarkSection}>
            <Text style={wordmark}>HYMNZ</Text>
          </Section>

          {children}

          <Section style={footer}>
            <Text style={footerText}>
              HYMNZ &middot;{" "}
              <Link href={baseUrl} style={footerLink}>
                hymnz.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Reusable content styles for campaign bodies — keeps every email consistent. */
export const styles = {
  card: {
    backgroundColor: tokens.surface,
    borderRadius: "16px",
    padding: "40px 32px",
  } as React.CSSProperties,
  heading: {
    fontFamily: tokens.serif,
    fontSize: "28px",
    lineHeight: "1.2",
    color: tokens.accent,
    margin: "0 0 20px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.7",
    color: tokens.textSecondary,
    margin: "0 0 16px",
  } as React.CSSProperties,
  buttonSection: {
    textAlign: "center" as const,
    padding: "16px 0 8px",
  } as React.CSSProperties,
  button: {
    display: "inline-block",
    backgroundColor: tokens.accent,
    color: tokens.midnight,
    fontWeight: 600,
    fontSize: "15px",
    textDecoration: "none",
    borderRadius: "8px",
    padding: "14px 32px",
  } as React.CSSProperties,
  divider: {
    borderColor: "rgba(255, 255, 255, 0.10)",
    margin: "32px 0 20px",
  } as React.CSSProperties,
  muted: {
    fontSize: "13px",
    lineHeight: "1.6",
    color: tokens.textMuted,
    margin: 0,
  } as React.CSSProperties,
};

const main: React.CSSProperties = {
  backgroundColor: tokens.midnight,
  fontFamily: tokens.sans,
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  width: "100%",
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 20px",
};

const logoSection: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "8px 0 0",
};

const logo: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "140px",
};

const wordmarkSection: React.CSSProperties = {
  textAlign: "center" as const,
  padding: 0,
  marginBottom: "20px",
  // Cyan radial glow behind the wordmark — mirrors the `gradient-divider` utility.
  backgroundImage:
    "radial-gradient(ellipse at center, rgba(0, 255, 251, 0.26) 0%, transparent 70%)",
};

const wordmark: React.CSSProperties = {
  fontFamily: tokens.serif,
  fontSize: "18px",
  fontWeight: 500,
  letterSpacing: "0.35em",
  textTransform: "uppercase" as const,
  color: tokens.textPrimary,
  margin: 0,
  // 0.35em trailing space keeps the glyph block visually centered despite tracking.
  paddingLeft: "0.35em",
};

const footer: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "24px 0 8px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: tokens.textMuted,
  margin: 0,
};

const footerLink: React.CSSProperties = {
  color: tokens.textPrimary,
  textDecoration: "underline",
};

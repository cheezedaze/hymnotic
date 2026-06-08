import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { baseUrl, HymnzShell, styles } from "./HymnzShell";

interface WelcomeProps {
  name?: string;
  ctaUrl?: string;
}

export default function Welcome({ name, ctaUrl }: WelcomeProps) {
  const greeting = name ? `Welcome, ${name}` : "Welcome to HYMNZ";
  const exploreUrl = ctaUrl || baseUrl;

  return (
    <HymnzShell preview="Welcome to HYMNZ — a sacred music experience">
      <Section style={styles.card}>
        <Heading style={styles.heading}>{greeting}</Heading>
        <Text style={styles.paragraph}>
          We&rsquo;re glad you&rsquo;re here. HYMNZ brings sacred music to life —
          timeless hymns reimagined for the way you listen today.
        </Text>
        <Text style={styles.paragraph}>
          Dive into curated collections, follow along with lyrics, and let the
          music carry you.
        </Text>

        <Section style={styles.buttonSection}>
          <Button style={styles.button} href={exploreUrl}>
            Start Listening
          </Button>
        </Section>

        <Hr style={styles.divider} />

        <Text style={styles.muted}>
          You&rsquo;re receiving this email because you created a HYMNZ account.
          If this wasn&rsquo;t you, you can safely ignore it.
        </Text>
      </Section>
    </HymnzShell>
  );
}

Welcome.PreviewProps = {
  name: "Friend",
  ctaUrl: "https://hymnz.com",
} as WelcomeProps;

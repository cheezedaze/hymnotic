import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { HymnzShell, styles } from "./HymnzShell";

interface ConfirmNewsletterProps {
  confirmUrl: string;
  firstName?: string;
}

export default function ConfirmNewsletter({
  confirmUrl,
  firstName,
}: ConfirmNewsletterProps) {
  return (
    <HymnzShell preview="Confirm your HYMNZ subscription — one tap and you're in">
      <Section style={styles.card}>
        <Heading style={styles.heading}>Be first to hear new hymns</Heading>
        <Text style={styles.paragraph}>
          {firstName ? `Hi ${firstName}, you` : "You"}&rsquo;re one tap away.
          Confirm below and we&rsquo;ll email you the moment new collections and
          releases land &mdash; no spam, just the music.
        </Text>

        <Section style={styles.buttonSection}>
          <Button style={styles.button} href={confirmUrl}>
            Confirm Subscription
          </Button>
        </Section>

        <Hr style={styles.divider} />

        <Text style={styles.muted}>
          This link expires in 7 days. If you didn&rsquo;t sign up for HYMNZ, you
          can safely ignore this email &mdash; you won&rsquo;t be subscribed.
        </Text>
      </Section>
    </HymnzShell>
  );
}

ConfirmNewsletter.PreviewProps = {
  firstName: "Friend",
  confirmUrl: "https://hymnz.com/auth/confirm-newsletter?token=example",
} as ConfirmNewsletterProps;

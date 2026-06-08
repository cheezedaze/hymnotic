import { Button, Heading, Section, Text } from "@react-email/components";
import { baseUrl, HymnzShell, styles } from "../HymnzShell";

// Each campaign module exports a default component plus `subject` (and
// optionally `from`). The CLI reads these when previewing, testing, and
// broadcasting. Author the body inside <HymnzShell> using the shared `styles`.

export const subject = "New on HYMNZ — the Advent collection";

export default function Example() {
  return (
    <HymnzShell preview="A new collection just landed on HYMNZ">
      <Section style={styles.card}>
        <Heading style={styles.heading}>The Advent Collection</Heading>
        <Text style={styles.paragraph}>
          Seven new arrangements to carry you through the season — familiar
          hymns reimagined for quiet evenings and bright mornings alike.
        </Text>
        <Section style={styles.buttonSection}>
          <Button style={styles.button} href={`${baseUrl}/collection/advent`}>
            Listen Now
          </Button>
        </Section>
      </Section>
    </HymnzShell>
  );
}

import { Button, Heading, Hr, Img, Section, Text } from "@react-email/components";
import { HymnzShell, styles, tokens } from "../HymnzShell";

// Inaugural HYMNZ newsletter — founder note, new track spotlight, Discord,
// and app download with the Apple auto-correct tip.

export const subject = "Welcome to the HYMNZ Family! + Fresh Beats Inside 🎧";

const familyImg =
  "https://d2y722s9xxtvrs.cloudfront.net/images/misc/hymnz-family-1776293459498.jpg";
const trackImg =
  "https://d2y722s9xxtvrs.cloudfront.net/images/artwork/little-light-1780899018365.jpg";
const discordUrl = "https://discord.gg/kdjW3rcau5";
const iosUrl = "https://apps.apple.com/app/id6759640168";
const androidUrl =
  "https://play.google.com/store/apps/details?id=com.hymnz.app";

export default function WelcomeNewsletter() {
  return (
    <HymnzShell preview="Welcome to the HYMNZ family — fresh beats inside">
      {/* A Note from the Founder */}
      <Section style={styles.card}>
        <Heading style={styles.heading}>A Note from the Founder</Heading>
        {/* Resend merge tag — resolves per-contact in broadcasts; falls back
            to "there" when a contact has no first name. */}
        <Text style={styles.paragraph}>{"Hey {{{FIRST_NAME|there}}},"}</Text>
        <Text style={styles.paragraph}>
          Welcome to the very first HYMNZ newsletter!
        </Text>
        <Text style={styles.paragraph}>
          Have you ever just sat around with a group of friends or family,
          completely bonding over a great track? It&rsquo;s honestly one of my
          absolute favorite pastimes. Music has this incredible power to bring
          us together, and that&rsquo;s exactly why I built this app.
        </Text>
        <Text style={styles.paragraph}>
          If you&rsquo;re already tuning in and enjoying the music along with
          the rest of our growing community, welcome to the family! HYMNZ is a
          space where we can have some fun, connect, and honor the music of our
          faith in fresh, modern ways.
        </Text>
        <Text style={styles.paragraph}>
          Thanks for being on this journey with me.
        </Text>
        <Text style={{ ...styles.paragraph, margin: "0 0 4px" }}>
          &mdash; <strong style={{ color: tokens.textPrimary }}>Chad Winks</strong>
        </Text>
        <Text style={{ ...styles.muted, fontStyle: "italic", marginBottom: "20px" }}>
          Founder, HYMNZ
        </Text>
        <Img src={familyImg} width="100%" alt="The Winks family" style={image} />
      </Section>

      {/* New Music Spotlight */}
      <Section style={{ ...styles.card, marginTop: "16px" }}>
        <Heading style={styles.heading}>New Music Spotlight 🔥</Heading>
        <Img
          src={trackImg}
          width="100%"
          alt="This Little Light of Mine"
          style={{ ...image, margin: "0 0 20px" }}
        />
        <Text style={{ ...styles.paragraph, ...trackTitle }}>
          &ldquo;This Little Light of Mine&rdquo;
        </Text>
        <Text style={styles.paragraph}>
          Check out our brand-new track, <strong style={strong}>&ldquo;This
          Little Light of Mine,&rdquo;</strong> rolling out on the{" "}
          <strong style={strong}>Blessed Beats</strong> station. We took a
          timeless classic and gave it a massive groove that we think
          you&rsquo;re going to love. Turn the volume up for this one!
        </Text>
      </Section>

      {/* Discord */}
      <Section style={{ ...styles.card, marginTop: "16px" }}>
        <Heading style={styles.heading}>Join the Conversation 💬</Heading>
        <Text style={styles.paragraph}>
          We&rsquo;re just getting this ball rolling, and I want to build this
          community <em>with</em> you.
        </Text>
        <Text style={styles.paragraph}>
          If you have feedback, want to share a story of how a song hit you,
          need to report a bug, or want to make a feature request, join our
          official Discord server. I&rsquo;ll be hanging out there regularly,
          and it&rsquo;s the best place to get direct updates and chat with me
          and the rest of the community.
        </Text>
        <Section style={styles.buttonSection}>
          <Button style={styles.button} href={discordUrl}>
            Join the HYMNZ Discord
          </Button>
        </Section>
      </Section>

      {/* Get the App */}
      <Section style={{ ...styles.card, marginTop: "16px" }}>
        <Heading style={styles.heading}>Get the App</Heading>
        <Text style={styles.paragraph}>
          If you haven&rsquo;t downloaded the app yet, or if you want to share
          it with your friends and family, you can grab it for iOS and Android
          right now.
        </Text>
        <Text style={tip}>
          🔔 <strong style={strong}>Pro-Tip:</strong> Make sure to enable push
          notifications so you never miss a new track drop or feature update!
        </Text>
        <Text style={styles.paragraph}>
          <strong style={strong}>Android user?</strong> Just search
          &ldquo;HYMNZ&rdquo; in the Play Store.
        </Text>
        <Text style={styles.paragraph}>
          <strong style={strong}>iPhone user?</strong> Apple&rsquo;s App Store
          auto-correct is a little weird! When you type in HYMNZ, it&rsquo;ll
          try to force-correct it to <em>&ldquo;hymns.&rdquo;</em> Just tap our
          actual name &ldquo;HYMNZ&rdquo; at the top of the search suggestions
          to find us.
        </Text>
        <Section style={styles.buttonSection}>
          <Button style={styles.button} href={iosUrl}>
            Download for iOS
          </Button>
        </Section>
        <Section style={{ ...styles.buttonSection, padding: "8px 0" }}>
          <Button style={buttonOutline} href={androidUrl}>
            Get it on Android
          </Button>
        </Section>

        <Hr style={styles.divider} />

        <Heading style={{ ...styles.heading, fontSize: "20px", margin: "0 0 12px" }}>
          Spread the Word!
        </Heading>
        <Text style={styles.paragraph}>
          If you&rsquo;re loving the vibe, please forward this email or share
          the app links with your loved ones. Let&rsquo;s keep growing the
          family.
        </Text>
        <Text style={{ ...styles.paragraph, margin: 0, color: tokens.accent }}>
          Stay blessed!
        </Text>
      </Section>
    </HymnzShell>
  );
}

const image: React.CSSProperties = {
  borderRadius: "12px",
  display: "block",
  width: "100%",
  height: "auto",
};

const trackTitle: React.CSSProperties = {
  fontFamily: tokens.serif,
  fontSize: "18px",
  color: tokens.textPrimary,
  textAlign: "center",
  margin: "0 0 12px",
};

const strong: React.CSSProperties = { color: tokens.textPrimary };

const tip: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: tokens.textSecondary,
  backgroundColor: "rgba(0, 255, 251, 0.08)",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "0 0 20px",
};

const buttonOutline: React.CSSProperties = {
  ...styles.button,
  backgroundColor: "transparent",
  color: tokens.accent,
  border: `1px solid ${tokens.accent}`,
};

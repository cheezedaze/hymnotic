import { MessageCircle } from "lucide-react";
import {
  DiscordIcon,
  TikTokIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  XIcon,
} from "./BrandIcons";

type SocialLink = {
  label: string;
  href: string;
  Icon: (props: { size?: number; className?: string }) => React.JSX.Element;
};

const DISCORD_URL = "https://discord.gg/TT3x2Df8";

const secondaryLinks: SocialLink[] = [
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@hymnzmusic",
    Icon: TikTokIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/hymnzmusic/",
    Icon: InstagramIcon,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/hymnzmusic",
    Icon: FacebookIcon,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@HYMNZmusic",
    Icon: YouTubeIcon,
  },
  {
    label: "X",
    href: "https://x.com/hymnzmusic",
    Icon: XIcon,
  },
];

export default function JoinTheDiscussion() {
  return (
    <div className="glass-heavy rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle size={16} className="text-accent" />
        <h2 className="text-display text-lg font-semibold text-text-primary">
          Join the Discussion
        </h2>
      </div>

      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Discord"
        className="flex items-center justify-center gap-3 w-full py-3 bg-accent/15 border border-accent/25 text-accent rounded-xl hover:bg-accent/25 transition-colors"
      >
        <DiscordIcon size={28} />
      </a>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {secondaryLinks.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex items-center justify-center w-11 h-11 glass rounded-full text-text-secondary hover:text-accent hover:bg-accent/15 transition-colors"
          >
            <Icon size={20} />
          </a>
        ))}
      </div>
    </div>
  );
}

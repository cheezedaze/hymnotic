import { MessageCircle } from "lucide-react";
import { FeedbackForm } from "./FeedbackForm";
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

const secondaryLinks: SocialLink[] = [
  { label: "Discord", href: "https://discord.gg/kdjW3rcau5", Icon: DiscordIcon },
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

export default function JoinTheDiscussion({ email }: { email: string | null }) {
  return (
    <div id="feedback" className="glass-heavy rounded-2xl p-6 space-y-4 scroll-mt-24">
      <div className="flex items-center gap-2">
        <MessageCircle size={16} className="text-accent" />
        <h2 className="text-display text-lg font-semibold text-text-primary">
          Join the Discussion
        </h2>
      </div>

      <FeedbackForm email={email} />

      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
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

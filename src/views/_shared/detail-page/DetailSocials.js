// urls: { linkedin, facebook, instagram, twitter, ... } — only platforms with truthy values render.

import {
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Globe,
} from "react-feather";
import { UncontrolledTooltip } from "reactstrap";

const ICONS = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
};

const COLORS = {
  linkedin: "#0a66c2",
  facebook: "#1877f2",
  instagram: "#e4405f",
  twitter: "#1da1f2",
  x: "#000",
  youtube: "#ff0000",
};

const DetailSocials = ({ urls = {}, title }) => {
  const entries = Object.entries(urls || {}).filter(([, v]) => !!v);
  if (!entries.length) return null;

  return (
    <div className="mb-1">
      {title ? <div className="text-muted small mb-50">{title}</div> : null}
      <div className="d-flex flex-wrap gap-1">
        {entries.map(([platform, url]) => {
          const Icon = ICONS[platform.toLowerCase()] || Globe;
          const id = `dp-social-${platform}`;
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              id={id}
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--bs-light)",
                color: COLORS[platform.toLowerCase()] || "var(--bs-primary)",
              }}
            >
              <Icon size={16} />
              <UncontrolledTooltip target={id} placement="top">
                {platform}
              </UncontrolledTooltip>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default DetailSocials;

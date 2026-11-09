import type { CSSProperties } from "react";
import close from "../assets/icons/close.svg";
import arrowLeft from "../assets/icons/arrow-left.svg";
import share from "../assets/icons/share.svg";
import download from "../assets/icons/download.svg";
import message from "../assets/icons/message.svg";
import email from "../assets/icons/email.svg";
import imageFailed from "../assets/icons/image-failed.svg";
import link from "../assets/icons/link.svg";
import more from "../assets/icons/more.svg";
import image from "../assets/icons/image.svg";
import userAdd from "../assets/icons/user-add.svg";

export const ICONS = {
  close,
  arrowLeft,
  share,
  download,
  message,
  email,
  imageFailed,
  link,
  more,
  image,
  userAdd,
};

export type IconName = keyof typeof ICONS;

/**
 * TDS outlined icons exported from the Figma file. Rendered as a CSS mask so that the
 * colour follows the Text (Icon) tokens — e.g. Text/Disable for the disabled state.
 */
export function Icon({
  name,
  size = 24,
  color = "currentColor",
  style,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const url = `url("${ICONS[name]}")`;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        ...style,
      }}
    />
  );
}

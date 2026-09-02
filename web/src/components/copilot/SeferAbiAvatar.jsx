import premiumAvatarAsset from "../../assets/sefer-abi-premium-avatar.png";
import { normalizeSeferAbiWidgetState } from "./SeferAbiWidgetState";

export default function SeferAbiAvatar({ state = "idle", size = 52, decorative = true }) {
  const normalizedState = normalizeSeferAbiWidgetState(state);
  const dimension = Number.isFinite(Number(size)) ? Number(size) : 52;

  return (
    <span
      className={`seferAbiAvatar seferAbiAvatar--${normalizedState}`}
      data-mascot-persona="mature-human"
      data-sefer-abi-state={normalizedState}
      style={{ width: dimension, height: dimension }}
      aria-hidden={decorative ? "true" : undefined}
    >
      <img className="seferAbiAvatar__image" src={premiumAvatarAsset} alt="" draggable="false" />
      <span className="seferAbiAvatar__stateMark" aria-hidden="true" />
    </span>
  );
}

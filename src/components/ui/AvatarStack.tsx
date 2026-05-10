import type { Participant } from "../../store/usePlansStore";
import styles from "./AvatarStack.module.css";

interface AvatarStackProps {
  participants: Participant[];
  max?: number;
  size?: number;
}

export default function AvatarStack({ 
  participants, 
  max = 3, 
  size = 26 
}: AvatarStackProps) {
  
  const visible = participants.slice(0, max);
  const overflow = participants.length - max;

  return (
    <div className={styles.stack}>
      <div className={styles.avatars}>
        {visible.map((p, i) => (
          <div
            key={p.id}
            title={p.id === "me" ? "You" : p.initials}
            className={styles.avatar}
            style={{
              width: size,
              height: size,
              background: p.color,
              marginLeft: i === 0 ? 0 : -(size * 0.24),
              fontSize: size * 0.38,
              zIndex: visible.length - i,
            }}
          >
            {p.initials}
          </div>
        ))}

        {overflow > 0 && (
          <div
            className={styles.overflow}
            style={{
              width: size,
              height: size,
              marginLeft: -(size * 0.24),
              fontSize: size * 0.34,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>

      <span className={styles.count}>
        {participants.length === 1 && participants[0].id === "me"
          ? "Just you"
          : `${participants.length} joined`}
      </span>
    </div>
  );
}
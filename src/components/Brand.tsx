import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label={`${APP_NAME} home`}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {APP_NAME}
    </Link>
  );
}

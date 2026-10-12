import { redirect } from "next/navigation";
import { getClock } from "@/lib/data";

export default async function ReviewIndex() {
  const clock = await getClock();
  redirect(`/app/review/${clock.reviewWeek}`);
}

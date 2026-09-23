import { redirect } from "next/navigation";

/** Nothing public lives at "/": send everyone to the app; unauthenticated users land on /login. */
export default function Home() {
  redirect("/dashboard");
}

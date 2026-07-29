import type { Metadata } from "next";
import WedgeLab from "./WedgeLab";

export const metadata: Metadata = {
  title: "Movable Wedge Lab · Drishya",
  description:
    "Build intuition for JEE mechanics by predicting, observing, and explaining a block on a movable wedge.",
};

export default function Home() {
  return <WedgeLab />;
}

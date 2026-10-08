import type { Metadata } from "next";
import LabRouter from "./LabRouter";

export const metadata: Metadata = {
  title: "Mechanics Labs · Drishya",
  description:
    "Interactive, adaptive mechanics lessons for difficult JEE Main and Advanced problems.",
};

export default function Home() {
  return <LabRouter />;
}

"use client";

import { useState } from "react";
import PulleyLab from "./PulleyLab";
import WedgeLab from "./WedgeLab";

type LabId = "wedge" | "pulley";

export default function LabRouter() {
  const [activeLab, setActiveLab] = useState<LabId>("wedge");

  return (
    <>
      <nav className="lab-switcher" aria-label="Mechanics labs">
        <button
          className={activeLab === "wedge" ? "active" : ""}
          onClick={() => setActiveLab("wedge")}
        >
          <span>01</span> WEDGE
        </button>
        <button
          className={activeLab === "pulley" ? "active" : ""}
          onClick={() => setActiveLab("pulley")}
        >
          <span>02</span> PULLEY
        </button>
      </nav>
      {activeLab === "wedge" ? <WedgeLab /> : <PulleyLab />}
    </>
  );
}

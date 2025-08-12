
import React, { useRef } from "react";
import InstallmentCalculator from "@/components/InstallmentCalculator";

type Props = {
  initialPrice?: number | null;
  projectName?: string | null;
};

/**
 * StableInstallmentCalculator renders InstallmentCalculator only once to avoid input focus loss
 * caused by parent re-renders. Subsequent prop changes are ignored by design.
 */
const StableInstallmentCalculator: React.FC<Props> = ({ initialPrice, projectName }) => {
  const elementRef = useRef<JSX.Element | null>(null);

  if (!elementRef.current) {
    const safePrice = typeof initialPrice === "number" && !Number.isNaN(initialPrice) ? initialPrice : 0;
    elementRef.current = (
      <InstallmentCalculator
        initialPrice={safePrice}
        projectName={projectName ?? undefined}
      />
    );
  }

  return elementRef.current;
};

export default StableInstallmentCalculator;


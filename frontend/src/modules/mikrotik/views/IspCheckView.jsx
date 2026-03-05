import React from "react";
import ComingSoon from "../components/ComingSoon";

export default function IspCheckView({ canManage, onNotify }) {
  return (
    <ComingSoon
      title="Check ISP"
      description="ISP probing dan health-check summary akan disambungkan ke data aktual."
      canRunAction={canManage}
      actionLabel="Run ISP Check"
      onAction={() => onNotify("Coming soon")}
    />
  );
}


import React from "react";
import ComingSoon from "../components/ComingSoon";

export default function ScriptUpdateView({ canManage, onNotify }) {
  return (
    <ComingSoon
      title="Automation Script Update"
      description="Template dan rollout script update sedang disiapkan untuk integrasi backend Mikrotik."
      canRunAction={canManage}
      actionLabel="Run Script Update"
      onAction={() => onNotify("Coming soon")}
    />
  );
}


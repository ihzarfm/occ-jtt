import React from "react";
import ComingSoon from "../components/ComingSoon";

export default function SshAccessView({ canManage, onNotify }) {
  return (
    <ComingSoon
      title="Akses Mikrotik SSH"
      description="Workflow SSH access Mikrotik sedang dirapikan ke module baru."
      canRunAction={canManage}
      actionLabel="Open SSH Panel"
      onAction={() => onNotify("Coming soon")}
    />
  );
}

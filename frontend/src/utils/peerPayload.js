export function buildSitePeerPayload({
  createPeerType,
  managedByAutomation,
  peerForm,
  sitePeerName,
  adminPurpose,
  adminTargetMode,
}) {
  return {
    peerType: createPeerType,
    managed: managedByAutomation,
    ...peerForm,
    name: sitePeerName,
    publicKey: peerForm.publicKey,
    keepalive: Number(peerForm.keepalive),
    purpose: adminPurpose,
    targetServer: adminTargetMode,
  };
}

export function buildAdminPeerPayload({
  createPeerType,
  managedByAutomation,
  peerForm,
  peerName,
  generatedPublicKey,
  adminPurpose,
  adminTargetMode,
}) {
  return {
    peerType: createPeerType,
    managed: managedByAutomation,
    ...peerForm,
    name: `Administrator-${peerName}`,
    publicKey: peerForm.publicKey || generatedPublicKey,
    keepalive: Number(peerForm.keepalive),
    purpose: adminPurpose,
    targetServer: adminTargetMode,
  };
}

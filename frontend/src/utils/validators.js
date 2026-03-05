export function normalizeSiteSegment(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeAdminName(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function sanitizeAllowedIPs(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[^0-9./]/g, "");
}

export function isValidIPv4CIDR(value) {
  const current = String(value || "").trim();
  if (!current) {
    return true;
  }

  const matcher = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/;
  const match = current.match(matcher);
  if (!match) {
    return false;
  }

  const octets = match[1].split(".").map((octet) => Number(octet));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  if (match[2] !== undefined) {
    const cidr = Number(match[2]);
    if (Number.isNaN(cidr) || cidr < 0 || cidr > 32) {
      return false;
    }
  }

  return true;
}

export function parseIPv4(value) {
  const matcher = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = String(value || "").trim().match(matcher);
  if (!match) {
    return null;
  }
  const octets = match.slice(1).map((item) => Number(item));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

export function normalizedServerID(value) {
  const current = String(value || "").toLowerCase().trim();
  if (current === "wg-its" || current === "stg-its") {
    return "wg-its";
  }
  if (current === "wg-cctv" || current === "stg-cctv") {
    return "wg-cctv";
  }
  return current;
}

export function overlayPair(serverID) {
  const normalized = normalizedServerID(serverID);
  if (normalized === "wg-its") {
    return [10, 21];
  }
  if (normalized === "wg-cctv") {
    return [10, 22];
  }
  return null;
}

export function isIPInOverlay(ip, serverID) {
  const octets = parseIPv4(ip);
  const pair = overlayPair(serverID);
  if (!octets || !pair) {
    return false;
  }
  return octets[0] === pair[0] && octets[1] === pair[1];
}

export function usedIPsForServer(peers, serverID) {
  const used = new Set();
  for (const peer of peers || []) {
    if (peer.assignedIP && isIPInOverlay(peer.assignedIP, serverID)) {
      used.add(String(peer.assignedIP).split("/")[0]);
    }
    if (Array.isArray(peer.assignments)) {
      for (const assignment of peer.assignments) {
        if (assignment.assignedIP && isIPInOverlay(assignment.assignedIP, serverID)) {
          used.add(String(assignment.assignedIP).split("/")[0]);
        }
      }
    }
  }
  return used;
}

export function availableAdminIPsFor(peers, serverID) {
  const prefix = serverID === "wg-its" ? "10.21.3." : "10.22.3.";
  const used = usedIPsForServer(peers, serverID);
  const available = [];
  for (let last = 2; last <= 254; last += 1) {
    const ip = `${prefix}${last}`;
    if (!used.has(ip)) {
      available.push(ip);
    }
    if (available.length >= 10) {
      break;
    }
  }
  return available;
}

export function adminRangeLabel(serverID) {
  if (serverID === "wg-its") {
    return "Allowed IP range: 10.21.3.2 - 10.21.3.254 (reserved .1 and .255)";
  }
  if (serverID === "wg-cctv") {
    return "Allowed IP range: 10.22.3.2 - 10.22.3.254 (reserved .1 and .255)";
  }
  return "Select target server to load allowed IP range.";
}

export function validateAdminIP(ipValue, serverID, peers) {
  const octets = parseIPv4(ipValue);
  if (!octets) {
    return "Assigned IP must be a valid IPv4 address.";
  }
  if (octets[3] === 1 || octets[3] === 255) {
    return "Reserved host (.1 or .255) is not allowed.";
  }
  if (octets[2] !== 3 || octets[3] < 2 || octets[3] > 254) {
    return "Assigned IP out of allowed administrator range.";
  }
  if (serverID === "wg-its" && (octets[0] !== 10 || octets[1] !== 21)) {
    return "Assigned IP must be in 10.21.3.2 - 10.21.3.254.";
  }
  if (serverID === "wg-cctv" && (octets[0] !== 10 || octets[1] !== 22)) {
    return "Assigned IP must be in 10.22.3.2 - 10.22.3.254.";
  }
  if (isIPInOverlay(ipValue, serverID) && usedIPsForServer(peers, serverID).has(String(ipValue).trim())) {
    return "IP already in use.";
  }
  return "";
}

export function normalizeUserField(fieldName, value) {
  if (fieldName === "nik") {
    return String(value || "").replace(/\D/g, "").slice(0, 6);
  }
  if (fieldName === "name") {
    return String(value || "").replace(/[^A-Za-z]/g, "");
  }
  return value;
}

export function validateUserForm(form) {
  const errors = { name: "", nik: "" };
  const namePattern = /^[A-Za-z]+$/;
  const nikPattern = /^[0-9]{6}$/;

  if (!String(form.name || "").trim()) {
    errors.name = "Name is required";
  } else if (!namePattern.test(String(form.name || ""))) {
    errors.name = "Name must contain letters only (A-Z), no spaces";
  }

  if (!String(form.nik || "").trim()) {
    errors.nik = "NIK is required";
  } else if (!nikPattern.test(String(form.nik || ""))) {
    errors.nik = "NIK must be exactly 6 digits";
  }

  return errors;
}

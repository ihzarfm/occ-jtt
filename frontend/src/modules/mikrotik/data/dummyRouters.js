export const dummyRouters = [
  {
    id: "rtr-jkt-01",
    name: "RTR-JKT-01",
    location: "Jakarta HQ",
    model: "Mikrotik CCR2004",
    status: "online",
    wanLinks: [
      { interface: "ether1", ip: "103.10.10.2/30", gateway: "103.10.10.1", isp: "ISP-A Fiber" },
      { interface: "ether2", ip: "180.20.20.6/30", gateway: "180.20.20.5", isp: "ISP-B DIA" },
    ],
  },
  {
    id: "rtr-bdg-01",
    name: "RTR-BDG-01",
    location: "Bandung Branch",
    model: "Mikrotik RB4011",
    status: "online",
    wanLinks: [
      { interface: "ether1", ip: "114.30.10.10/29", gateway: "114.30.10.9", isp: "ISP-C Broadband" },
    ],
  },
  {
    id: "rtr-sby-01",
    name: "RTR-SBY-01",
    location: "Surabaya Branch",
    model: "Mikrotik hEX S",
    status: "offline",
    wanLinks: [
      { interface: "ether1", ip: "36.80.40.22/30", gateway: "36.80.40.21", isp: "ISP-D Wireless" },
      { interface: "lte1", ip: "10.200.1.12/24", gateway: "10.200.1.1", isp: "Cellular Backup" },
    ],
  },
];


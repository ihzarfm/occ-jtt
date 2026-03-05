package wireguard

import (
	"strings"
	"testing"
	"time"
)

func TestFormatAdministratorPeerTimingLog(t *testing.T) {
	line := formatAdministratorPeerTimingLog(administratorPeerTimingLog{
		Peer:        "RAF-LAPTOP",
		PeerType:    "administrator",
		Managed:     false,
		ServerScope: "wg-its",
		AssignedIP:  "10.21.3.10",
		TValidate:   2 * time.Millisecond,
		TWriteState: 3 * time.Millisecond,
		Total:       8 * time.Millisecond,
		Err:         "",
	})

	expected := []string{
		"mode=administrator",
		`peer="RAF-LAPTOP"`,
		`peerType="administrator"`,
		"managed=false",
		`serverScope="wg-its"`,
		`assigned_ip="10.21.3.10"`,
		"t_validate=2ms",
		"t_write_state=3ms",
		"total=8ms",
	}
	for _, token := range expected {
		if !strings.Contains(line, token) {
			t.Fatalf("expected token %q in line: %s", token, line)
		}
	}
}

func TestFormatSitePeerTimingLogIncludesServerSpecificIPs(t *testing.T) {
	line := formatSitePeerTimingLog(sitePeerTimingLog{
		Peer:     "CABIN-CILEDUG",
		PeerType: "site",
		Managed:  true,
		Servers:  []string{"stg-cctv", "stg-its"},
		AssignedIPsByServer: map[string]string{
			"stg-its":  "10.21.0.3",
			"stg-cctv": "10.22.0.8",
		},
		ApplyTimings: map[string]siteApplyTiming{
			"stg-its":  {Total: 10 * time.Millisecond},
			"stg-cctv": {Total: 11 * time.Millisecond},
		},
		Total: 20 * time.Millisecond,
	})

	expected := []string{
		"mode=site",
		`peer="CABIN-CILEDUG"`,
		`peerType="site"`,
		"managed=true",
		`assigned_ip_stg_its="10.21.0.3"`,
		`assigned_ip_stg_cctv="10.22.0.8"`,
		"apply_stg_its_total=10ms",
		"apply_stg_cctv_total=11ms",
	}
	for _, token := range expected {
		if !strings.Contains(line, token) {
			t.Fatalf("expected token %q in line: %s", token, line)
		}
	}
}

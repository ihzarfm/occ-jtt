package wireguard

import "testing"

func TestCanonicalizeServerID(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{in: "stg-its", want: "wg-its"},
		{in: "stg-cctv", want: "wg-cctv"},
		{in: "wg-its", want: "wg-its"},
		{in: "wg-cctv", want: "wg-cctv"},
	}

	for _, tc := range cases {
		if got := CanonicalizeServerID(tc.in); got != tc.want {
			t.Fatalf("CanonicalizeServerID(%q)=%q want %q", tc.in, got, tc.want)
		}
	}
}

func TestServerAliases(t *testing.T) {
	its := ServerAliases("wg-its")
	if len(its) != 2 || its[0] != "wg-its" || its[1] != "stg-its" {
		t.Fatalf("unexpected aliases for wg-its: %#v", its)
	}

	cctv := ServerAliases("wg-cctv")
	if len(cctv) != 2 || cctv[0] != "wg-cctv" || cctv[1] != "stg-cctv" {
		t.Fatalf("unexpected aliases for wg-cctv: %#v", cctv)
	}
}

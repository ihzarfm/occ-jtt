package logs

func isAllowedCategory(category string) bool {
	return category == "" || category == "wireguard" || category == "mikrotik" || category == "user"
}

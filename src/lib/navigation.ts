export const platformNavigation = [
  { href: "/marketplace", label: "Marketplace", group: "Public" },
  { href: "/vaults/demo-vault", label: "Vault detail", group: "Public" },
  { href: "/portfolio", label: "Portfolio", group: "Investor" },
  { href: "/operator/vaults", label: "Operator vaults", group: "Operator" },
  {
    href: "/operator/vaults/new",
    label: "Create vault",
    group: "Operator",
  },
  {
    href: "/admin/verifications",
    label: "Verification queue",
    group: "Admin",
  },
] as const;

import { Languages, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import type { ThemePreference } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  Icon: typeof Sun;
  key: "themeLight" | "themeDark" | "themeSystem";
}[] = [
  { Icon: Sun, key: "themeLight", value: "light" },
  { Icon: Moon, key: "themeDark", value: "dark" },
  { Icon: Monitor, key: "themeSystem", value: "system" },
];

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { label: "ไทย", value: "th" },
  { label: "English", value: "en" },
];

/** Full-width segmented controls for the settings page. */
export function ThemeToggleGroup() {
  const { preference, setPreference } = useTheme();
  const { t } = useI18n();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={preference}
      onValueChange={(value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setPreference(value);
        }
      }}
      className="w-full"
    >
      {THEME_OPTIONS.map(({ value, Icon, key }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="flex-1"
          aria-label={t[key]}
        >
          <Icon />
          {t[key]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function LanguageToggleGroup() {
  const { locale, setLocale } = useI18n();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={locale}
      onValueChange={(value) => {
        if (value === "th" || value === "en") {
          setLocale(value);
        }
      }}
      className="w-full"
    >
      {LOCALE_OPTIONS.map(({ value, label }) => (
        <ToggleGroupItem key={value} value={value} className="flex-1">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Compact header controls: a theme menu and a language menu. */
export function HeaderPreferences() {
  const { preference, resolved, setPreference } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const ThemeIcon =
    preference === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t.theme}>
            <ThemeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {THEME_OPTIONS.map(({ value, Icon, key }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => setPreference(value)}
              data-active={preference === value || undefined}
              className="data-active:font-semibold"
            >
              <Icon />
              {t[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t.language}>
            <Languages />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LOCALE_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => setLocale(value)}
              data-active={locale === value || undefined}
              className="data-active:font-semibold"
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/i18n";

const LanguagePicker: React.FC = () => {
  const { i18n, t } = useTranslation();

  const current = (i18n.language || "en").slice(0, 2);

  const handleChange = async (code: SupportedLanguageCode) => {
    await i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label={t("common.language")}>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{current.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => void handleChange(lang.code)}
            className={lang.code === current ? "font-medium" : undefined}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguagePicker;

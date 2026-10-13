/**
 * Pages publiques en arabe (/ar/cercles/…) : la langue de l'adresse prime sur
 * la langue mémorisée ; la page bascule en arabe (sens RTL posé par
 * I18nProvider) dès le montage.
 */
import { useEffect } from "react";
import { useLang } from "../../i18n/i18n";

export function useLangueForcee(langue?: "ar") {
  const { lang, setLang } = useLang();
  useEffect(() => {
    if (langue && lang !== langue) setLang(langue);
  }, [langue]); // eslint-disable-line react-hooks/exhaustive-deps
}

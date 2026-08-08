import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import en from "./en";
import fr from "./fr";

const LANGUAGE_STORAGE_KEY = "app-language";

export type AppLanguage = "en" | "fr";

async function detectInitialLanguage(): Promise<AppLanguage> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return deviceLanguage === "fr" ? "fr" : "en";
}

// Resolves once i18next is ready to use — awaited once at app startup before
// rendering, so no screen ever flashes untranslated keys.
export async function initI18n(): Promise<AppLanguage> {
  const language = await detectInitialLanguage();
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
  return language;
}

export async function setAppLanguage(language: AppLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
}

export default i18n;

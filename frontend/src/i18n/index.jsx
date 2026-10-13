import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const STORAGE_LANG = 'vygo-lang' // 'en' | 'si' | 'ta'

/*
 * Seed dictionary. This is a scaffold: only the highest-visibility strings
 * (navigation + onboarding) are wired today. Extend `dict` and call `t('key')`
 * (or `t('namespace.key')`) anywhere to add localized copy. Untranslated keys
 * fall back to English, then to the raw key, so the app never breaks.
 */
const dict = {
  en: {
    'nav.search': 'Search',
    'nav.routes': 'Routes',
    'nav.bookings': 'My Bookings',
    'nav.alerts': 'Alerts',
    'nav.liveRoutes': 'Live Routes',
    'nav.help': 'Help',
    'nav.signin': 'Sign in',
    'nav.dashboard': 'Dashboard',
    'nav.fleet': 'Fleet',
    'nav.schedules': 'Schedules',
    'nav.reports': 'Reports',
    'nav.scan': 'Scan QR',
    'nav.trips': 'Trips',
    'action.saveContinue': 'Save & continue',
    'action.testConnection': 'Test connection',
    'connect.title': 'Connect to your server',
    'connect.subtitle':
      'Set the address of the VyGo backend running on your computer so this phone can reach it.',
    'connect.hint': 'Use your computer’s LAN IP, e.g. 192.168.1.50:8080',
    'connect.placeholder': '192.168.1.50:8080',
    'connect.enterFirst': 'Enter the backend server address, e.g. 192.168.1.50:8080',
    'connect.enterFirstShort': 'Enter a server address first',
    'connect.scan': 'Scan network',
    'connect.scanning': 'Scanning…',
    'connect.scanHint': 'Automatically find a VyGo backend on this Wi‑Fi',
    'connect.found': 'Found servers',
    'connect.useThis': 'Use this',
    'connect.noServers': 'No server found on this network — enter the address manually.',
    'connect.copyInvite': 'Copy invite link',
    'connect.inviteCopied': 'Invite link copied',
    'settings.theme': 'Theme',
    'settings.theme.dark': 'Dark',
    'settings.theme.light': 'Light',
    'settings.theme.system': 'System',
    'settings.motion': 'Motion',
    'settings.motion.full': 'Full',
    'settings.motion.reduced': 'Reduced',
    'settings.motion.system': 'System',
    'settings.language': 'Language',
  },
  si: {
    'nav.search': 'සොයන්න',
    'nav.routes': 'මාර්ග',
    'nav.bookings': 'මගේ වෙන්කිරීම්',
    'nav.alerts': 'දැනුම්දීම්',
    'nav.liveRoutes': 'සජීවී මාර්ග',
    'nav.help': 'උදව්',
    'nav.signin': 'පුරන්න',
    'nav.dashboard': 'උපකරණ පුවරුව',
    'nav.fleet': 'ගමන් කඳවුරු',
    'nav.schedules': 'කාලසටහන්',
    'nav.reports': 'වාර්තා',
    'nav.scan': 'QR ස්කෑන් කරන්න',
    'nav.trips': 'ගමන්',
    'action.saveContinue': 'සුරකින්න සහ ඉදිරියට යන්න',
    'action.testConnection': 'සබැඳිය පරීක්ෂා කරන්න',
    'connect.title': 'ඔබේ සේවාදායකයට සබැඳෙන්න',
    'connect.subtitle':
      'මෙම දුරකථනයට එහි ලඟා විය හැකි වන පරිදි ඔබේ පරිගණකයේ ධාවනය වන VyGo බැකෙන්ඩ් ලිපිනය සකසන්න.',
    'connect.hint': 'ඔබේ පරිගණකයේ LAN IP භාවිත කරන්න, උදා. 192.168.1.50:8080',
    'connect.placeholder': '192.168.1.50:8080',
    'connect.enterFirst': 'උදා. 192.168.1.50:8080 බැකෙන්ඩ් සේවාදායක ලිපිනය ඇතුළත් කරන්න',
    'connect.enterFirstShort': 'මුලින්ම සේවාදායක ලිපිනයක් ඇතුළත් කරන්න',
    'connect.scan': 'ජාලය පරිලෝකනය කරන්න',
    'connect.scanning': 'පරිලෝකනය කරමින්…',
    'connect.scanHint': 'මෙම Wi‑Fi ජාලයේ VyGo බැකෙන්ඩ් එක ස්වයංක්‍රීයව සොයන්න',
    'connect.found': 'සොයාගත් සේවාදායක',
    'connect.useThis': 'භාවිත කරන්න',
    'connect.noServers': 'මෙම ජාලයේ සේවාදායකයක් නොමැත — ලිපිනය අතින් ඇතුළත් කරන්න.',
    'connect.copyInvite': 'ආමන්ත්‍රණ සබැඳිය පිටපත් කරන්න',
    'connect.inviteCopied': 'ආමන්ත්‍රණ සබැඳිය පිටපත් කරන ලදී',
    'settings.theme': 'තේමාව',
    'settings.theme.dark': 'අඳුරු',
    'settings.theme.light': 'දීප්ත',
    'settings.theme.system': 'පද්ධතිය',
    'settings.motion': 'චලනය',
    'settings.motion.full': 'සම්පූර්ණ',
    'settings.motion.reduced': 'අඩු',
    'settings.motion.system': 'පද්ධතිය',
    'settings.language': 'භාෂාව',
  },
  ta: {
    'nav.search': 'தேடு',
    'nav.routes': 'வழித்தடங்கள்',
    'nav.bookings': 'எனது முன்பதிவுகள்',
    'nav.alerts': 'எச்சரிக்கைகள்',
    'nav.liveRoutes': 'நேரடி வழித்தடங்கள்',
    'nav.help': 'உதவி',
    'nav.signin': 'உள்நுழை',
    'nav.dashboard': 'டாஷ்போர்டு',
    'nav.fleet': 'படை',
    'nav.schedules': 'அட்டவணைகள்',
    'nav.reports': 'அறிக்கைகள்',
    'nav.scan': 'QR ஸ்கேன்',
    'nav.trips': 'பயணங்கள்',
    'action.saveContinue': 'சேமி & தொடர்',
    'action.testConnection': 'இணைப்பைச் சோதி',
    'connect.title': 'உங்கள் சேவையகத்துடன் இணைக்கவும்',
    'connect.subtitle':
      'உங்கள் தொலைபேசி அதை அணுகும் வகையில் உங்கள் கணினியில் இயங்கும் VyGo பின்புல முகவரியை அமைக்கவும்.',
    'connect.hint': 'உங்கள் கணினியின் LAN IP ஐப் பயன்படுத்தவும், எ.கா. 192.168.1.50:8080',
    'connect.placeholder': '192.168.1.50:8080',
    'connect.enterFirst': 'பின்புல சேவையக முகவரியை உள்ளிடவும், எ.கா. 192.168.1.50:8080',
    'connect.enterFirstShort': 'முதலில் சேவையக முகவரியை உள்ளிடவும்',
    'connect.scan': 'பிணையத்தை ஸ்கேன் செய்',
    'connect.scanning': 'ஸ்கேன் செய்கிறது…',
    'connect.scanHint': 'இந்த Wi‑Fi இல் உள்ள VyGo பின்புலத்தை தானாகக் கண்டறியவும்',
    'connect.found': 'கண்டறியப்பட்ட சேவையகங்கள்',
    'connect.useThis': 'இதைப் பயன்படுத்து',
    'connect.noServers': 'இந்த பிணையத்தில் சேவையகம் இல்லை — முகவரியை கைமுறையாக உள்ளிடவும்.',
    'connect.copyInvite': 'அழைப்பு இணைப்பை நகலெடு',
    'connect.inviteCopied': 'அழைப்பு இணைப்பு நகலெடுக்கப்பட்டது',
    'settings.theme': 'தீம்',
    'settings.theme.dark': 'இருள்',
    'settings.theme.light': 'ஒளி',
    'settings.theme.system': 'கணினி',
    'settings.motion': 'அசைவு',
    'settings.motion.full': 'முழுமை',
    'settings.motion.reduced': 'குறைந்த',
    'settings.motion.system': 'கணினி',
    'settings.language': 'மொழி',
  },
}

export const SUPPORTED_LANGS = ['en', 'si', 'ta']
const LANG_LABELS = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' }

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem(STORAGE_LANG) || 'en'
  })

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l) => {
    if (!SUPPORTED_LANGS.includes(l)) return
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_LANG, l)
    } catch {
      /* storage may be unavailable */
    }
  }, [])

  const t = useCallback(
    (key) => {
      const table = dict[lang] || dict.en
      if (table[key] != null) return table[key]
      if (dict.en[key] != null) return dict.en[key]
      return key
    },
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t, langs: SUPPORTED_LANGS, langLabels: LANG_LABELS }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) return { lang: 'en', setLang: () => {}, t: (k) => dict.en[k] ?? k, langs: SUPPORTED_LANGS, langLabels: LANG_LABELS }
  return ctx
}
